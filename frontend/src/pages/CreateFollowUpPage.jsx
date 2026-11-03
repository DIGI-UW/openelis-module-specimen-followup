import React, { useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import {
  Button,
  Column,
  DataTable,
  Grid,
  InlineNotification,
  Loading,
  RadioButton,
  RadioButtonGroup,
  Section,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableSelectRow,
  TextArea,
} from "@carbon/react";
import { PageBreadCrumb, SearchPatientForm } from "openelis_core/components";
import {
  useConfigurationProperties,
  useModuleConfig,
  useNotifications,
  useOpenElisApi,
} from "openelis_core/sdk";
import {
  NotificationKinds,
  AlertDialog,
  CustomDatePicker,
} from "openelis_core/components";
import {
  ROUTES,
  endpoints,
  fieldErrorsOf,
  isRefusal,
  isoToSiteDate,
  PRIORITIES,
  siteDateFormat,
  siteDateToIso,
  todayPlusDays,
} from "../followUpApi";
import PatientCard from "../components/PatientCard";

const EMPTY_FORM = {
  actionType: "",
  description: "",
  priority: "NORMAL",
  assignedUserId: "",
  dueDate: "",
  notes: "",
};

/**
 * Create a follow-up: find an existing patient with the core's own search
 * component, pick one of that patient's specimens (read from the core through
 * the module API), describe the action, save.
 */
export default function CreateFollowUpPage() {
  const intl = useIntl();
  const history = useHistory();
  const api = useOpenElisApi();
  const config = useModuleConfig("specimen-followup");
  const dateFormat = siteDateFormat(useConfigurationProperties());
  const notifications = useNotifications();
  const [patient, setPatient] = useState(null);
  const [specimens, setSpecimens] = useState(null);
  const [specimensError, setSpecimensError] = useState(false);
  const [selectedSampleId, setSelectedSampleId] = useState("");
  const [options, setOptions] = useState({ actionTypes: [] });
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get(endpoints.options)
      .then(setOptions)
      .catch(() => setOptions({ actionTypes: [] }));
    api
      .get(endpoints.users)
      .then(setUsers)
      .catch(() => setUsers([]));
  }, [api]);

  useEffect(() => {
    if (config && config.defaultDueDays !== undefined && !form.dueDate) {
      setForm((current) => ({
        ...current,
        dueDate: todayPlusDays(config.defaultDueDays),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config && config.defaultDueDays]);

  const selectPatient = (selected) => {
    const id =
      selected && (selected.patientPK || selected.patientId || selected.id);
    if (!id) {
      return;
    }
    setPatient({ ...selected, patientId: String(id) });
    setSpecimens(null);
    setSpecimensError(false);
    setSelectedSampleId("");
    api
      .get(endpoints.specimensOfPatient(id))
      .then((body) => setSpecimens(body.specimens || []))
      .catch(() => {
        setSpecimens([]);
        setSpecimensError(true);
      });
  };

  const clearPatient = () => {
    setPatient(null);
    setSpecimens(null);
    setSelectedSampleId("");
  };

  const update = (field) => (event) => {
    const value = event && event.target ? event.target.value : event;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = () => {
    const found = {};
    if (!patient) {
      found.patientId = intl.formatMessage({
        id: "mod.specimen-followup.create.patientRequired",
      });
    }
    if (!selectedSampleId) {
      found.sampleId = intl.formatMessage({
        id: "mod.specimen-followup.create.specimenRequired",
      });
    }
    if (!form.actionType) {
      found.actionType = intl.formatMessage({
        id: "mod.specimen-followup.form.required",
      });
    }
    if (!form.description.trim()) {
      found.description = intl.formatMessage({
        id: "mod.specimen-followup.form.required",
      });
    }
    if (!form.priority) {
      found.priority = intl.formatMessage({
        id: "mod.specimen-followup.form.required",
      });
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const save = async () => {
    if (!validate()) {
      return;
    }
    setSaving(true);
    const payload = {
      patientId: patient.patientId,
      sampleId: selectedSampleId,
      actionType: form.actionType,
      description: form.description.trim(),
      priority: form.priority,
      assignedUserId: form.assignedUserId || null,
      dueDate: form.dueDate || null,
      notes: form.notes.trim() || null,
    };
    const response = await api.post(endpoints.followUps(), payload);
    setSaving(false);
    if (isRefusal(response)) {
      setErrors(fieldErrorsOf(response));
      notifications.addNotification({
        kind: NotificationKinds.error,
        title: intl.formatMessage({
          id: "mod.specimen-followup.create.failed",
        }),
        message: (response && response.message) || "",
      });
      notifications.setNotificationVisible(true);
      return;
    }
    notifications.addNotification({
      kind: NotificationKinds.success,
      title: intl.formatMessage({ id: "mod.specimen-followup.create.saved" }),
      message: intl.formatMessage(
        { id: "mod.specimen-followup.create.savedMessage" },
        { number: response.followUpNumber },
      ),
    });
    notifications.setNotificationVisible(true);
    history.push(ROUTES.detail(response.id));
  };

  const specimenHeaders = useMemo(
    () => [
      {
        key: "accessionNumber",
        header: intl.formatMessage({
          id: "mod.specimen-followup.specimen.accession",
        }),
      },
      {
        key: "sampleTypes",
        header: intl.formatMessage({
          id: "mod.specimen-followup.specimen.types",
        }),
      },
      {
        key: "collectionDate",
        header: intl.formatMessage({
          id: "mod.specimen-followup.specimen.collected",
        }),
      },
      {
        key: "receivedDate",
        header: intl.formatMessage({
          id: "mod.specimen-followup.specimen.received",
        }),
      },
      {
        key: "status",
        header: intl.formatMessage({
          id: "mod.specimen-followup.specimen.status",
        }),
      },
      {
        key: "outstandingFollowUps",
        header: intl.formatMessage({
          id: "mod.specimen-followup.specimen.outstanding",
        }),
      },
    ],
    [intl],
  );
  const specimenRows = (specimens || []).map((specimen) => ({
    id: specimen.sampleId,
    accessionNumber: specimen.accessionNumber,
    sampleTypes: (specimen.sampleTypes || []).join(", "),
    collectionDate: specimen.collectionDate || "",
    receivedDate: specimen.receivedDate || "",
    status: specimen.status || "",
    outstandingFollowUps: String(specimen.outstandingFollowUps || 0),
  }));

  return (
    <>
      {notifications.notificationVisible && <AlertDialog />}
      <PageBreadCrumb
        breadcrumbs={[
          { label: "home.label", link: "/" },
          { label: "mod.specimen-followup.menu.title", link: ROUTES.list },
          { label: "mod.specimen-followup.create.title", link: ROUTES.create },
        ]}
      />
      <Grid fullWidth>
        <Column lg={16} md={8} sm={4}>
          <Section>
            <h1 data-testid="followup-create-title">
              <FormattedMessage id="mod.specimen-followup.create.title" />
            </h1>
            <p>
              <FormattedMessage id="mod.specimen-followup.create.intro" />
            </p>
          </Section>
        </Column>

        <Column lg={16} md={8} sm={4}>
          <h2 className="mod-followup-step">
            <FormattedMessage id="mod.specimen-followup.create.step.patient" />
          </h2>
          {patient ? (
            <PatientCard patient={patient} onClear={clearPatient} />
          ) : (
            <SearchPatientForm
              getSelectedPatient={selectPatient}
              idPrefix="followup"
            />
          )}
          {errors.patientId && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title={errors.patientId}
            />
          )}
        </Column>

        {patient && (
          <Column lg={16} md={8} sm={4}>
            <h2 className="mod-followup-step">
              <FormattedMessage id="mod.specimen-followup.create.step.specimen" />
            </h2>
            {specimens === null && <Loading withOverlay={false} small />}
            {specimensError && (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title={intl.formatMessage({
                  id: "mod.specimen-followup.create.specimensFailed",
                })}
              />
            )}
            {specimens && specimens.length === 0 && !specimensError && (
              <p data-testid="followup-no-specimens">
                <FormattedMessage id="mod.specimen-followup.create.noSpecimens" />
              </p>
            )}
            {specimens && specimens.length > 0 && (
              <DataTable rows={specimenRows} headers={specimenHeaders} radio>
                {({
                  rows,
                  headers,
                  getHeaderProps,
                  getRowProps,
                  getSelectionProps,
                  getTableProps,
                }) => (
                  <TableContainer>
                    <Table
                      {...getTableProps()}
                      size="md"
                      aria-label="specimens"
                    >
                      <TableHead>
                        <TableRow>
                          <th scope="col" />
                          {headers.map((header) => (
                            <TableHeader
                              {...getHeaderProps({ header })}
                              key={header.key}
                            >
                              {header.header}
                            </TableHeader>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow
                            {...getRowProps({ row })}
                            key={row.id}
                            data-testid={`specimen-row-${row.id}`}
                          >
                            <TableSelectRow
                              {...getSelectionProps({ row })}
                              checked={selectedSampleId === row.id}
                              onSelect={() => {
                                setSelectedSampleId(row.id);
                                setErrors((current) => ({
                                  ...current,
                                  sampleId: undefined,
                                }));
                              }}
                            />
                            {row.cells.map((cell) => (
                              <TableCell key={cell.id}>{cell.value}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </DataTable>
            )}
            {errors.sampleId && (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title={errors.sampleId}
              />
            )}
          </Column>
        )}

        {patient && selectedSampleId && (
          <>
            <Column lg={16} md={8} sm={4}>
              <h2 className="mod-followup-step">
                <FormattedMessage id="mod.specimen-followup.create.step.details" />
              </h2>
            </Column>
            <Column lg={8} md={4} sm={4}>
              <Select
                id="followup-action-type"
                labelText={
                  intl.formatMessage({
                    id: "mod.specimen-followup.field.actionType",
                  }) + " *"
                }
                value={form.actionType}
                onChange={update("actionType")}
                invalid={Boolean(errors.actionType)}
                invalidText={errors.actionType}
              >
                <SelectItem
                  value=""
                  text={intl.formatMessage({
                    id: "mod.specimen-followup.form.choose",
                  })}
                />
                {(options.actionTypes || []).map((type) => (
                  <SelectItem
                    key={type.value}
                    value={type.value}
                    text={type.label}
                  />
                ))}
              </Select>
            </Column>
            <Column lg={8} md={4} sm={4}>
              <RadioButtonGroup
                legendText={
                  intl.formatMessage({
                    id: "mod.specimen-followup.field.priority",
                  }) + " *"
                }
                name="followup-priority"
                valueSelected={form.priority}
                onChange={(value) => update("priority")(value)}
                invalid={Boolean(errors.priority)}
                invalidText={errors.priority}
              >
                {PRIORITIES.map((priority) => (
                  <RadioButton
                    key={priority}
                    id={`followup-priority-${priority}`}
                    value={priority}
                    labelText={intl.formatMessage({
                      id: `mod.specimen-followup.priority.${priority}`,
                    })}
                  />
                ))}
              </RadioButtonGroup>
            </Column>
            <Column lg={16} md={8} sm={4}>
              <TextArea
                id="followup-description"
                labelText={
                  intl.formatMessage({
                    id: "mod.specimen-followup.field.description",
                  }) + " *"
                }
                value={form.description}
                onChange={update("description")}
                maxCount={2000}
                enableCounter
                invalid={Boolean(errors.description)}
                invalidText={errors.description}
              />
            </Column>
            <Column lg={8} md={4} sm={4}>
              <Select
                id="followup-assignee"
                labelText={intl.formatMessage({
                  id: "mod.specimen-followup.field.assignee",
                })}
                value={form.assignedUserId}
                onChange={update("assignedUserId")}
                invalid={Boolean(errors.assignedUserId)}
                invalidText={errors.assignedUserId}
              >
                <SelectItem
                  value=""
                  text={intl.formatMessage({
                    id: "mod.specimen-followup.form.unassigned",
                  })}
                />
                {users.map((user) => (
                  <SelectItem
                    key={user.id}
                    value={user.id}
                    text={`${user.displayName} (${user.loginName})`}
                  />
                ))}
              </Select>
            </Column>
            <Column lg={8} md={4} sm={4}>
              <CustomDatePicker
                id="followup-due-date"
                labelText={intl.formatMessage({
                  id: "mod.specimen-followup.field.dueDate",
                })}
                value={isoToSiteDate(form.dueDate, dateFormat)}
                updateStateValue
                onChange={(text) =>
                  update("dueDate")(siteDateToIso(text, dateFormat))
                }
                invalid={Boolean(errors.dueDate)}
                invalidText={errors.dueDate}
              />
            </Column>
            <Column lg={16} md={8} sm={4}>
              <TextArea
                id="followup-notes"
                labelText={intl.formatMessage({
                  id: "mod.specimen-followup.field.notes",
                })}
                value={form.notes}
                onChange={update("notes")}
                maxCount={4000}
                enableCounter
                invalid={Boolean(errors.notes)}
                invalidText={errors.notes}
              />
            </Column>
            <Column lg={16} md={8} sm={4}>
              <Button id="followup-save" onClick={save} disabled={saving}>
                <FormattedMessage id="mod.specimen-followup.create.save" />
              </Button>{" "}
              <Button
                kind="secondary"
                onClick={() => history.push(ROUTES.list)}
              >
                <FormattedMessage id="mod.specimen-followup.form.cancel" />
              </Button>
            </Column>
          </>
        )}
      </Grid>
    </>
  );
}
