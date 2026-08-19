import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/server";
import { requireFeature } from "@/lib/billing/plan";
import { featureLocked } from "@/lib/billing/deny";
import { isFlagEnabled } from "@/lib/flags/flags";
import { isRateLimited } from "@/lib/ratelimit/limiter";
import { scheduleCompanyIngest } from "@/lib/ai/tenant-ingest";
import {
  previewImport,
  commitImport,
  ImportTooLargeError,
  ImportHeaderMismatchError,
  ImportHasErrorsError,
  MAX_CSV_BYTES,
} from "@/lib/import/import-service";

export const runtime = "nodejs";

/**
 * POST /api/import/customers — CSV import, no multipart, no filesystem, no
 * client-supplied filename. The client reads the file with FileReader and
 * posts the raw text; the server never receives a file object at all, which
 * excludes the whole path-traversal/temp-file-storage class of upload
 * vulnerabilities by construction (Phase 5 / N4).
 */
export async function POST(req: Request) {
  let body: { companyId?: string; csv?: string; mode?: "preview" | "commit" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { companyId, csv, mode } = body;
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  if (typeof csv !== "string") return NextResponse.json({ error: "csv (string) is required" }, { status: 400 });
  if (mode !== "preview" && mode !== "commit") return NextResponse.json({ error: 'mode must be "preview" or "commit"' }, { status: 400 });

  const { deny } = await requirePermission(req, "invoice:create", companyId);
  if (deny) return deny;

  const denial = await requireFeature(companyId, "bulkImport");
  if (denial) return featureLocked(denial);

  if (!(await isFlagEnabled(companyId, "csvImport"))) {
    return NextResponse.json({ error: "CSV import is not enabled for this account" }, { status: 403 });
  }

  if (await isRateLimited("import", companyId, 10, 3600)) {
    return NextResponse.json({ error: "Too many import attempts for this account — try again later" }, { status: 429 });
  }

  if (Buffer.byteLength(csv, "utf8") > MAX_CSV_BYTES) {
    return NextResponse.json({ error: `File exceeds the ${MAX_CSV_BYTES.toLocaleString()}-byte limit` }, { status: 400 });
  }

  try {
    if (mode === "preview") {
      const preview = await previewImport(companyId, "customers", csv);
      return NextResponse.json(preview);
    }
    const result = await commitImport(companyId, "customers", csv);
    if (result.summary.create > 0) scheduleCompanyIngest(companyId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ImportTooLargeError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof ImportHeaderMismatchError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof ImportHasErrorsError) return NextResponse.json(err.preview, { status: 422 });
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
