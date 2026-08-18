# MYAQ Soft Start 01

Status: authorized for implementation by Rom Ituarte on 2026-08-14.

## Purpose

Use one authenticated early-access environment for Rom, Rosie, Armando, and
Carlos. Features are released to this cohort before broader patient access.
This is not four separate deployments; account metadata controls each person's
access in the shared application.

## Participant profiles

| Participant | Pilot role | Intended validation | Patient record access |
| --- | --- | --- | --- |
| Rom | `founder` | Clinical/content judgment and complete product flow | Own portal only, plus existing separately governed admin access |
| Rosie | `participant` | Real-life patient usability, Spanish, mobile/PWA | Own portal only |
| Armando | `operations` | Operational clarity and growth workflow | None unless separately authorized and operationally necessary |
| Carlos | `technical` | Authentication, devices, performance, and deployment | None unless separately authorized and technically necessary |

## Clerk private metadata

Each existing Clerk user is enrolled with private metadata. Do not place this
configuration in public or unsafe metadata.

```json
{
  "plan": "pilot",
  "pilot": {
    "enabled": true,
    "cohort": "myaq-soft-start-001",
    "role": "participant",
    "language": "es",
    "features": ["patient_portal", "aq_buddy", "food_scan"]
  }
}
```

Use `founder`, `participant`, `operations`, or `technical` for `role`.
Armando and Carlos should initially omit `patient_portal` unless they have an
authorized fictional/own record binding. The `aq_buddy` and `food_scan`
features are automatically enabled for every enrolled pilot account.

If a participant is linked to an Airtable patient record, continue using the
existing `aqslimPatientId` private metadata field. Never bind one participant
to another person's real record for testing.

## Release sequence

1. My AQSLIM portal, AQ Buddy, and governed meal-photo estimates.
2. Restaurant menu advisor using a menu photo supplied by the participant.
3. Refrigerator photo, confirmed ingredient list, and phase-compatible ideas.
4. Weekly adherence and discussion summary.

## Food-photo limits

Pilot accounts use the Elite safety ceiling: 15 per day and 450 per calendar
month. Meal images are resized in the browser before analysis to control cost.
Results are explicitly presented as estimates, not exact nutritional values.

## Pilot review questions

After each new feature, collect three short answers:

1. What worked?
2. What was confusing?
3. What would have made this more useful?

Review login success, feature errors, response time, scan volume, estimated
provider cost, safety escalations, and participant usefulness feedback before
opening the feature to a larger patient group.

## Lessons carried forward from the Monica pilot

- Preserve Spanish/English choice.
- Test the production URL on the intended browser before sending it.
- Verify Home Screen/PWA behavior and cached assets after each release.
- Keep experimental modules separate from the official patient record.
- Use authenticated cloud-backed accounts; do not depend on device-only data.
- Keep technical exports and JSON out of the participant-facing flow.
