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
[docs/modules.md](https://github.com/DIGI-UW/OpenELIS-Global-2/blob/develop/docs/modules.md).

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
  ([OpenELIS-Global-2](https://github.com/DIGI-UW/OpenELIS-Global-2)).

## Dev mode: run the module on the core's dev stack

Run the dev stack **from the OpenELIS core checkout, not from this folder**.
`scripts/dev-stack` belongs to the core; this module's folder is only passed to
it with `--module`:

```bash
cd OpenELIS-Global-2                  # the core checkout
bash scripts/setup-workspace.sh       # first time only
scripts/dev-stack up --module /path/to/openelis-module-specimen-followup
scripts/dev-stack url                 # open this URL, log in as admin / adminADMIN!
```

Add `--setup light` to run the core without the FHIR server, the Analyzer
Bridge and the analyzer simulator, which this module does not need:
`scripts/dev-stack up --setup light --module /path/to/openelis-module-specimen-followup`.

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

## Prod mode: install the JAR in openelis-docker

1. Get the JAR (see [Getting the JAR](#getting-the-jar)). For production, use
   the one attached to a [release](https://github.com/DIGI-UW/openelis-module-specimen-followup/releases).
2. Copy the JAR into `configs/modules/` of the
   [openelis-docker](https://github.com/DIGI-UW/openelis-docker) checkout and
   restart the webapp:

   ```bash
   cp specimen-followup-1.0.0.jar /path/to/openelis-docker/configs/modules/
   docker compose up -d
   docker compose restart oe.openelis.org
   ```

3. Check the webapp log for `[module:specimen-followup] STARTED`. Admin >
   Modules lists the module and its state.
4. In Role Management, grant `mod.specimen-followup.view` and
   `mod.specimen-followup.manage` to the roles that need them. Results,
   Reception and Validation receive both on first install.

In production the pages come from the JAR; there is no dev server.

| Task    | Steps                                                                                          |
| ------- | ---------------------------------------------------------------------------------------------- |
| Upgrade | Replace the JAR with the new version (never two versions side by side) and restart the webapp. |
| Disable | Create `specimen-followup-<version>.jar.disabled` next to the JAR and restart the webapp.      |
| Remove  | Delete the JAR and restart the webapp. The table and its data stay.                            |

## Getting the JAR

| Source                                                                                                | When it is made                                                                  | Kept         | Use it for                             |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------ | -------------------------------------- |
| [Releases](https://github.com/DIGI-UW/openelis-module-specimen-followup/releases)                     | Every published release (see [Making a release](#making-a-release))              | Permanently  | Production installs                    |
| [CI artifacts](https://github.com/DIGI-UW/openelis-module-specimen-followup/actions/workflows/ci.yml) | Every successful CI run: each push to `main`, each pull request, each manual run | 90 days      | Testing a change before it is released |
| Your own build                                                                                        | `mvn verify` (see [Building](#building))                                         | Your machine | Development                            |

**From a release:** open the
[Releases page](https://github.com/DIGI-UW/openelis-module-specimen-followup/releases),
pick the version, and download `specimen-followup-<version>.jar` under
**Assets**. From the command line:

```bash
gh release download v1.0.0 --repo DIGI-UW/openelis-module-specimen-followup --pattern '*.jar'
```

**From the latest CI run:** open
[CI runs on main](https://github.com/DIGI-UW/openelis-module-specimen-followup/actions/workflows/ci.yml?query=branch%3Amain+is%3Asuccess),
click the newest successful run, and download **specimen-followup-module**
under **Artifacts** at the bottom of the run page. GitHub delivers it as a zip
that contains the JAR. From the command line:

```bash
run=$(gh run list --repo DIGI-UW/openelis-module-specimen-followup --workflow ci.yml --branch main --status success --limit 1 --json databaseId --jq '.[0].databaseId')
gh run download "$run" --repo DIGI-UW/openelis-module-specimen-followup --name specimen-followup-module
```

A CI build of `main` is named `specimen-followup-<version>-SNAPSHOT.jar`; a
release build drops the `-SNAPSHOT`.

## Making a release

1. Set `"version"` in `src/main/resources/META-INF/openelis-module.json` to the
   new version, for example `1.1.0`, and merge it into `main`. The core records
   this version, so the release refuses a tag that does not match it.
2. Optional: check it first as a draft. Run the
   [CI workflow](https://github.com/DIGI-UW/openelis-module-specimen-followup/actions/workflows/ci.yml)
   by hand (**Run workflow**) with **Version to build as a draft release** set
   to `1.1.0`. It builds and tests that version and creates a draft release
   `v1.1.0` with the JAR attached, visible only to maintainers. Publish it from
   the Releases page, or delete it.
3. Or publish directly by pushing the version tag:

   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```

   CI builds and tests `1.1.0`, then publishes the GitHub release `v1.1.0` with
   `specimen-followup-1.1.0.jar` attached and release notes generated from the
   merged pull requests.

## Building

The build compiles against the core's artifacts in your local Maven
repository. `scripts/dev-stack up --module` installs them; without the dev
stack, install them once per core commit from the core checkout:

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
repository variables (`DIGI-UW/OpenELIS-Global-2` at `develop` by default),
uploads the JAR as the `specimen-followup-module` artifact of the run, and, for
a version tag or a manual run with a version, attaches it to a GitHub release
(see [Making a release](#making-a-release)).

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
