# Specimen Follow-up & Action Tracker

An [OpenELIS Global](https://github.com/DIGI-UW/OpenELIS-Global-2) module:
laboratory staff record follow-up actions on a patient's existing specimens
(request a recollection, investigate a specimen issue, ask for missing patient
information, notify the responsible clinician, or anything else), assign them,
give them a due date and a priority, and track them from open to completed or
cancelled.

It is developed and released independently of the core. It owns its own table,
migrations, services, REST API, permissions, navigation entries and pages, and
reuses the core's patient, sample and user services and the core's own UI
components. It never modifies a core table: a follow-up references the patient
and the specimen by their ids and reads their details from the core when it
shows them.

Built against the module system described in the core's
[docs/modules.md](https://github.com/DIGI-UW/OpenELIS-Global-2/blob/modula/docs/modules.md).

## What it adds to OpenELIS

| Contribution     | Detail                                                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Table            | `clinlims.mod_specimen_followup_record` (own Liquibase changelog, changeset ids `specimen-followup-*`)                                |
| Permissions      | `mod.specimen-followup.view` (read, pages), `mod.specimen-followup.manage` (create, edit, status, delete); granted in Role Management |
| Navigation       | Order → Specimen Follow-up → Create Follow-up, View Follow-ups                                                                       |
| Pages            | `/m/specimen-followup/create`, `/m/specimen-followup/followups`, `/m/specimen-followup/followups/{id}`                              |
| API              | `/rest/modules/specimen-followup/followups[/{id}[/status]]`, `/patients/{patientId}/specimens`, `/users`, `/options`                  |
| Core services    | `PatientService`, `SampleService`, `SampleHumanService`, `SampleItemService`, `TypeOfSampleService`, `SystemUserService`, `IStatusService` |
| Core UI          | `SearchPatientForm`, `PageBreadCrumb`, `AlertDialog` and the shell's session, notification and API hooks via `openelis_core/*`        |
| Configuration    | `modules.specimen-followup.defaultDueDays` (default 3)                                                                              |

### Rules

- A follow-up is created `OPEN` against an existing patient and one of that
  patient's specimens; the specimen must belong to the patient.
- `OPEN` → `IN_PROGRESS` → `COMPLETED` or `CANCELLED`; an in-progress
  follow-up may go back to open. Completed and cancelled follow-ups are kept
  for history: they cannot be edited, reopened or deleted.
- Only an open follow-up can be deleted (with confirmation). Patients and
  specimens are never touched.

## Building

Requirements: Java 21, Maven, and a local install of the core contracts at the
version in `pom.xml` (`openelis.version`), produced by
`mvn -f module-contracts/pom.xml install` and
`mvn install -DskipTests -Dmaven.test.skip=true` and
`mvn -f module-test/pom.xml install` in the core checkout on the `modula`
branch. Node is downloaded by the build.

```bash
mvn verify                      # backend tests, frontend build and tests, the JAR
mvn verify -DskipFrontend=true  # backend only
```

The JAR, `target/specimen-followup-<version>.jar`, carries the manifest
(`META-INF/openelis-module.json`), the classes, the changelog and the prebuilt
pages (`META-INF/resources/modules/specimen-followup/`).

CI (`.github/workflows/ci.yml`) does the same on every push and pull request:
it checks out the core named by the `CORE_REPOSITORY` and `CORE_REF`
repository variables (`DIGI-UW/OpenELIS-Global-2` at `modula` by default),
installs the contracts and the core classes once per core commit (cached), runs
`mvn verify` and uploads the JAR as a build artifact.

## Installing

Copy the JAR into the deployment's modules directory (`volume/modules` in the
core's compose files, `configs/modules` in `openelis-docker`) and restart the
webapp. The core migrates the table, registers the permissions and the menu
entries, and serves the pages. Grant `mod.specimen-followup.view` and
`mod.specimen-followup.manage` to roles in Role Management (Results, Reception
and Validation receive them on first install).

To remove it, delete the JAR and restart; the table stays.

## Developing the pages against a running core

```bash
cd frontend && npm install && npm run dev        # serves the remote on :5174
```

In the OpenELIS browser tab (dev mode), set
`localStorage["oe.module-override.specimen-followup"] = "http://localhost:5174/remoteEntry.js"`
and reload: the shell loads the pages from this server instead of the JAR.

## Layout

```
pom.xml                                   provided: openelis-module-api, openelis-spi, openelisglobal:classes
src/main/resources/META-INF/openelis-module.json
src/main/resources/liquibase/specimen-followup/changelog.xml
src/main/java/org/openelisglobal/module/followup/
  SpecimenFollowUpModule.java             lifecycle (validate, onStart, onUpgrade)
  domain/                                 FollowUp entity, enums with the status rules
  repository/FollowUpRepository.java      JPA on the core entity manager
  service/                                FollowUpService (rules), CoreLookupService (core data)
  web/FollowUpRestController.java         /rest/modules/specimen-followup/**
frontend/                                 Vite + Module Federation remote
  src/pages/                              CreateFollowUpPage, FollowUpListPage, FollowUpDetailPage
  public/messages/en.json                 mod.specimen-followup.* messages
src/test/java/...                         service rules, controller contract, manifest contract
```
