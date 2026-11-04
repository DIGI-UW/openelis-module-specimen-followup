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

| Contribution  | Detail                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Table         | `clinlims.mod_specimen_followup_record` (own Liquibase changelog, changeset ids `specimen-followup-*`)                                     |
| Permissions   | `mod.specimen-followup.view` (read, pages), `mod.specimen-followup.manage` (create, edit, status, delete); granted in Role Management      |
| Navigation    | Order → Specimen Follow-up → Create Follow-up, View Follow-ups                                                                             |
| Pages         | `/m/specimen-followup/create`, `/m/specimen-followup/followups`, `/m/specimen-followup/followups/{id}`                                     |
| API           | `/rest/modules/specimen-followup/followups[/{id}[/status]]`, `/patients/{patientId}/specimens`, `/users`, `/options`                       |
| Core services | `PatientService`, `SampleService`, `SampleHumanService`, `SampleItemService`, `TypeOfSampleService`, `SystemUserService`, `IStatusService` |
| Core UI       | `SearchPatientForm`, `PageBreadCrumb`, `AlertDialog` and the shell's session, notification and API hooks via `openelis_core/*`             |
| Configuration | `modules.specimen-followup.defaultDueDays` (default 3)                                                                                     |

### Rules

- A follow-up is created `OPEN` against an existing patient and one of that
  patient's specimens; the specimen must belong to the patient.
- `OPEN` → `IN_PROGRESS` → `COMPLETED` or `CANCELLED`; an in-progress
  follow-up may go back to open. Completed and cancelled follow-ups are kept
  for history: they cannot be edited, reopened or deleted.
- Only an open follow-up can be deleted (with confirmation). Patients and
  specimens are never touched.

## Requirements

- Java 21 and Maven. Node.js on the host for the dev server; the Maven build
  downloads its own Node for the JAR.
- Docker, and a checkout of the core
  ([OpenELIS-Global-2](https://github.com/DIGI-UW/OpenELIS-Global-2)) on the
  `modula` branch, where the module system lives until it reaches `develop`.

## Dev mode: run the module on the core's dev stack

From the core checkout, start the dev stack with this module:

```bash
cd OpenELIS-Global-2
git checkout modula
bash scripts/setup-workspace.sh       # first time only
DEV_STACK_IMAGE_TAG=modula scripts/dev-stack up --module=/path/to/openelis-module-specimen-followup
scripts/dev-stack url                 # open this URL, log in as admin / adminADMIN!
```

That one command deploys both halves of the module:

| Half     | What `up --module` does                                                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Backend  | Builds the core and installs the artifacts this module compiles against, builds this JAR, installs it as `volume/modules/specimen-followup.jar` in the core checkout, restarts the webapp. |
| Frontend | Starts this module's Vite dev server (`npm run dev` in `frontend/`, port 5174) and points the shell at it, so the pages load from your sources with hot reload.                            |

While you work:

- **Pages** (`frontend/src`): save the file; the browser reloads the change.
- **Java code, Liquibase files or the manifest**: run the same `up --module`
  command again. It rebuilds the JAR and restarts the webapp.
- **Logs**: `scripts/dev-stack logs -f oe.openelis.org` for the webapp (the
  module logs as `[module:specimen-followup]`), and
  `.dev-stack/modules/specimen-followup-vite.log` in the core checkout for the
  dev server.
- **Stop**: `scripts/dev-stack down` stops the stack and the dev server.
- **Remove the module**: delete `volume/modules/specimen-followup.jar` in the
  core checkout and run `scripts/dev-stack up`. The table stays.

`DEV_STACK_IMAGE_TAG=modula` selects the development images that can load
modules; `--build` builds them from the core checkout instead.

## Prod mode: install the JAR in openelis-docker

1. Build the JAR (see [Building](#building)), or download it from the
   `specimen-followup-module` artifact of a CI run. The result is
   `target/specimen-followup-<version>.jar`.
2. In the [openelis-docker](https://github.com/DIGI-UW/openelis-docker)
   checkout, run the images that can load modules. Until the module system
   reaches `develop`, change the `itechuw/openelis-global-2*:develop` image tags
   in `docker-compose.yml` to `:modula`.
3. Copy the JAR into `configs/modules/` and restart the webapp:

   ```bash
   cp target/specimen-followup-1.0.0.jar /path/to/openelis-docker/configs/modules/
   docker compose up -d
   docker compose restart oe.openelis.org
   ```

4. Check the webapp log for `[module:specimen-followup] STARTED`. Admin >
   Modules lists the module and its state.
5. In Role Management, grant `mod.specimen-followup.view` and
   `mod.specimen-followup.manage` to the roles that need them. Results,
   Reception and Validation receive both on first install.

In production the pages come from the JAR; there is no dev server.

| Task    | Steps                                                                                          |
| ------- | ---------------------------------------------------------------------------------------------- |
| Upgrade | Replace the JAR with the new version (never two versions side by side) and restart the webapp. |
| Disable | Create `specimen-followup-<version>.jar.disabled` next to the JAR and restart the webapp.      |
| Remove  | Delete the JAR and restart the webapp. The table and its data stay.                            |

## Building

The build compiles against the core's artifacts in your local Maven
repository. `scripts/dev-stack up --module` installs them; without the dev
stack, install them once per core commit from the core checkout on `modula`:

```bash
mvn -q -f dataexport/pom.xml install -DskipTests -Dmaven.test.skip=true
mvn -q -f module-contracts/pom.xml install -DskipTests
mvn -q install -DskipTests -Dmaven.test.skip=true
mvn -q -f module-test/pom.xml install -DskipTests
```

Then, in this repository:

```bash
mvn verify                      # backend tests, frontend build and tests, the JAR
mvn verify -DskipFrontend=true  # backend only
```

The JAR, `target/specimen-followup-<version>.jar`, carries the manifest
(`META-INF/openelis-module.json`), the classes, the Liquibase changelogs and
the prebuilt pages (`META-INF/resources/modules/specimen-followup/`).

CI (`.github/workflows/ci.yml`) runs the same build on every push and pull
request against the core named by the `CORE_REPOSITORY` and `CORE_REF`
repository variables (`DIGI-UW/OpenELIS-Global-2` at `modula` by default) and
uploads the JAR as a build artifact.

## Layout

```
pom.xml                                   provided: openelis-module-api, openelis-spi, openelisglobal:classes
src/main/resources/META-INF/openelis-module.json
src/main/resources/liquibase/base.xml      the master changelog the manifest names; includes the files below in order
src/main/resources/liquibase/specimen-followup/changelog.xml
src/main/resources/liquibase/specimen-followup/002-follow-up-indexes.xml
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
