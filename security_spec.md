# Firebase Security Rules Specification

This specification governs the database security policies for the NYSC Katsina Camp Market operator database.

## 1. Data Invariants
- **Marketers**: Must have a valid unique 10-digit phone number, non-empty full name, stand number, and trade category.
- **Workers**: Must belong to an existing marketer and have a designated roll/role.
- **Activities**: Logs can only be appended (disallowing modifications or deletions) and must contain a timestamp.

## 2. Invalidation & Validation Scenarios
- **Scenario 1 (Unauthenticated Writes)**: Any write action must include valid schema constraints.
- **Scenario 2 (Forbidden Update Overwrite)**: Non-admin users cannot alter a marketer's verification status once it's verified, nor can they arbitrarily set verificationStatus to 'verified' by default.
- **Scenario 3 (Data Corruption Prevent)**: ID fields must conform to standard regular expressions to prevent ID Poisoning resource attacks.

## 3. Rules Proposal
- `match /marketers/{marketerId}`: Anyone can read (for verification and checkpoint validations). Anyone can create high-integrity registrations conformant with schema helper rules. Only administrators can delete or modify statuses.
- `match /activities/{activityId}`: Anyone can read, and anyone can create/append audit trails. No one can edit or delete existing logs to maintain audit integrity.
