# FatooraLite PRD v1.0

## Product Name

FatooraLite

## Product Category

ZATCA Phase 2 E-Invoicing Compliance Platform

## Vision

Enable Saudi SMEs to become fully ZATCA Phase 2 compliant within hours instead of weeks, without ERP implementations, consultants, or technical expertise.

---

# Problem Statement

Saudi businesses above the ZATCA threshold are legally required to comply with Phase 2 e-invoicing requirements.

Compliance requires:

* UBL 2.1 XML generation
* Invoice UUID generation
* Cryptographic hashing
* Digital signatures
* QR code generation
* Real-time invoice clearance
* B2C reporting
* Audit trail retention

Most SMEs:

* Use Excel
* Use local accounting software
* Have no dedicated IT team
* Do not understand Fatoora requirements

Current solutions are:

* Expensive
* ERP-centric
* Complex
* Enterprise-focused

SMEs need a simpler solution.

---

# Product Goal

Become the fastest compliance platform for Saudi SMEs.

Success Metric:

A business should be able to:

Create Invoice → Submit → Clear with ZATCA

in under 60 seconds.

---

# Target Customers

## Primary

Saudi SMEs

Revenue:

SAR 375,000 – SAR 5,000,000

Industries:

* Retail
* Pharmacies
* Medical Clinics
* Trading
* Construction
* Automotive Workshops
* Restaurants
* Agencies

---

## Secondary

Accounting Firms

Tax Consultants

Compliance Consultants

Serving multiple SME clients.

---

# Core Value Proposition

"Become ZATCA Phase 2 compliant today."

Not:

* Accounting Software
* ERP
* Bookkeeping Platform

Compliance-first.

---

# MVP Scope

## Module 1

### Authentication

Features:

* Login
* Register
* Forgot Password
* MFA

Roles:

* Owner
* Accountant
* Employee

---

## Module 2

### Company Setup

Store:

* Company Name
* VAT Number
* CR Number
* Address
* Branches

Validate:

* VAT format
* CR format

---

## Module 3

### ZATCA Integration

Functions:

* CSR generation
* Compliance CSID onboarding
* Production CSID onboarding
* Certificate storage
* Certificate renewal reminders

Status Indicators:

* Connected
* Pending
* Expired
* Failed

---

## Module 4

### Invoice Creation

Support:

* Standard Invoice
* Simplified Invoice
* Credit Note
* Debit Note

Invoice Fields:

* Customer
* VAT Number
* Products
* Quantity
* Price
* VAT
* Total

Auto-generate:

* UUID
* QR Code
* XML

---

## Module 5

### Invoice Clearance

Workflow:

Draft

↓

Validate

↓

Sign

↓

Submit

↓

Clear

↓

Archive

Store:

* Clearance response
* Rejection reason
* Submission timestamp

---

## Module 6

### Reporting

For simplified invoices:

Auto-submit reports to ZATCA.

Features:

* Batch reporting
* Retry failed reports
* Status monitoring

---

## Module 7

### Compliance Dashboard

Metrics:

* Compliance Score
* Total Invoices
* Cleared Invoices
* Failed Invoices
* Certificate Status
* API Health

Widgets:

* Clearance Rate
* Reporting Success Rate
* Compliance Health

---

## Module 8

### Audit Vault

Store:

* Original XML
* Signed XML
* QR Payload
* API Responses
* Invoice History

Retention:

Minimum 6 years

Search:

* Invoice Number
* UUID
* Customer
* Date

---

# AI Compliance Assistant (Phase 2)

Functions:

Explain:

* Rejection reasons
* Validation failures
* Compliance issues

Examples:

"Why did invoice INV-205 fail?"

"Explain ZATCA error code 4005."

"Show invoices requiring action."

---

# User Flow

User Creates Company

↓

Connects ZATCA

↓

Gets Production CSID

↓

Creates Invoice

↓

Invoice Signed

↓

Invoice Submitted

↓

Invoice Cleared

↓

Invoice Archived

↓

Dashboard Updated

---

# Non Functional Requirements

Availability:

99.9%

Response Time:

< 2 seconds

Invoice Submission:

< 10 seconds

Security:

* TLS 1.3
* AES-256
* Role Permissions
* Audit Logging

---

# API Requirements

Internal Services:

Invoice Service

Compliance Service

Certificate Service

Audit Service

Reporting Service

Notification Service

AI Service

---

# Notifications

Certificate Expiry

Failed Invoice

Failed Reporting

Compliance Risk

API Downtime

Email

WhatsApp

In-App

---

# Analytics

Revenue

VAT Collected

Top Customers

Top Products

Clearance Success

Compliance Trend

Branch Performance

---

# Pricing

Starter

SAR 49/month

1 Branch

500 Invoices

---

Growth

SAR 99/month

5 Branches

5000 Invoices

---

Professional

SAR 199/month

Unlimited Invoices

Advanced Analytics

Audit Vault

---

Enterprise

Custom Pricing

---

# Success Metrics

Business Metrics

* First paying customer
* 10 demo requests
* 50 active companies
* 1000 invoices processed

Product Metrics

* 99% clearance success
* <2% failed submissions
* 95% dashboard usage
* <5 minute onboarding

---

# Launch Plan

Phase 1

* CSID acquisition
* Production onboarding
* Landing page
* Demo environment

Phase 2

* Outreach to Wave 24 businesses
* WhatsApp sales
* Email campaigns

Phase 3

* Accounting firm partnerships
* Arabic SEO
* Referral program

---

# Future Roadmap

v2

* AI Compliance Assistant
* Natural Language Search
* Smart Validation

v3

* Multi-Entity Support
* Accountant Portal
* Partner Dashboard

v4

* UAE E-Invoicing
* Oman Compliance
* Bahrain Compliance

Ultimate Goal:

Become the compliance operating system for GCC SMEs.
