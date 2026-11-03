import React, { useCallback, useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import {
  Button,
  Column,
  Grid,
  InlineNotification,
  Loading,
  Modal,
  RadioButton,
  RadioButtonGroup,
  Section,
  Select,
  SelectItem,
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  StructuredListWrapper,
  Tag,
  TextArea,
} from "@carbon/react";
import {
  PageBreadCrumb,
  AlertDialog,
  CustomDatePicker,
  NotificationKinds,
} from "openelis_core/components";
import {
  useConfigurationProperties,
  useNotifications,
  useOpenElisApi,
  usePermission,
} from "openelis_core/sdk";
import {
  ROUTES,
  endpoints,
  fieldErrorsOf,
  isRefusal,
  isoToSiteDate,
  PRIORITIES,
  siteDateFormat,
  siteDateToIso,
} from "../followUpApi";
import PatientCard from "../components/PatientCard";

const STATUS_TAG = {
  OPEN: "blue",
  IN_PROGRESS: "teal",
  COMPLETED: "green",
  CANCELLED: "gray",
};

/**
 * One follow-up: its identifier, the patient and specimen as the core knows
 * them, the action, and (for a user with the manage key) editing, the allowed
 * status transitions and deletion while still open.
 */
export default function FollowUpDetailPage() {
  const intl = useIntl();
  const history = useHistory();
  const { followUpId } = useParams();
  const api = useOpenElisApi();
  const notifications = useNotifications();
  const canManage = usePermission("mod.specimen-followup.manage");
  const dateFormat = siteDateFormat(useConfigurationProperties());
  const [followUp, setFollowUp] = useState(null);
  const [missing, setMissing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [options, setOptions] = useState({ actionTypes: [] });
  const [users, setUsers] = useState([]);
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusNote, setStatusNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .get(endpoints.followUp(followUpId))
      .then((body) => {
        setFollowUp(body);
        setMissing(false);
      })
      .catch(() => setMissing(true));
  }, [api, followUpId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!canManage) {
      return;
    }
    api
      .get(endpoints.options)
      .then(setOptions)
      .catch(() => setOptions({ actionTypes: [] }));
    api
      .get(endpoints.users)
      .then(setUsers)
      .catch(() => setUsers([]));
  }, [api, canManage]);

  const notify = (kind, titleId, message) => {
    notifications.addNotification({
      kind,
      title: intl.formatMessage({ id: titleId }),
      message: message || "",
    });
    notifications.setNotificationVisible(true);
  };

  const startEditing = () => {
    setForm({
      actionType: followUp.actionType || "",
      description: followUp.description || "",
      priority: followUp.priority || "NORMAL",
      assignedUserId: followUp.assignedUserId || "",
      dueDate: followUp.dueDate || "",
      notes: followUp.notes || "",
    });
    setErrors({});
    setEditing(true);
  };

  const update = (field) => (event) => {
    const value = event && event.target ? event.target.value : event;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const saveEdit = async () => {
    const found = {};
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
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    setBusy(true);
    const response = await api.put(endpoints.followUp(followUp.id), {
      patientId: followUp.patientId,
      sampleId: followUp.sampleId,
      actionType: form.actionType,
      description: form.description.trim(),
      priority: form.priority,
      assignedUserId: form.assignedUserId || null,
      dueDate: form.dueDate || null,
      notes: form.notes.trim() || null,
    });
    setBusy(false);
    if (isRefusal(response)) {
      setErrors(fieldErrorsOf(response));
      notify(
        NotificationKinds.error,
        "mod.specimen-followup.detail.updateFailed",
        response && response.message,
      );
      return;
    }
    setFollowUp(response);
    setEditing(false);
    notify(NotificationKinds.success, "mod.specimen-followup.detail.updated");
  };

  const changeStatus = async () => {
    setBusy(true);
    const response = await api.put(endpoints.status(followUp.id), {
      status: statusTarget,
      note: statusNote.trim(),
    });
    setBusy(false);
    if (isRefusal(response)) {
      notify(
        NotificationKinds.error,
        "mod.specimen-followup.detail.statusFailed",
        response && response.message,
      );
      setStatusTarget(null);
      return;
    }
    setFollowUp(response);
    setStatusTarget(null);
    setStatusNote("");
    notify(
      NotificationKinds.success,
      "mod.specimen-followup.detail.statusChanged",
    );
  };

  const remove = async () => {
    setBusy(true);
    const status = await api.del(endpoints.followUp(followUp.id));
    setBusy(false);
    setConfirmDelete(false);
    if (status !== 204 && status !== 200) {
      notify(
        NotificationKinds.error,
        "mod.specimen-followup.detail.deleteFailed",
      );
      load();
      return;
    }
    notify(NotificationKinds.success, "mod.specimen-followup.detail.deleted");
    history.push(ROUTES.list);
  };

  if (missing) {
    return (
      <Grid fullWidth>
        <Column lg={16} md={8} sm={4}>
          <InlineNotification
            kind="warning"
            lowContrast
            hideCloseButton
            title={intl.formatMessage({
              id: "mod.specimen-followup.detail.notFound",
            })}
          />
        </Column>
      </Grid>
    );
  }
  if (!followUp) {
    return <Loading withOverlay={false} />;
  }

  const row = (labelId, value, testId) => (
    <StructuredListRow key={labelId}>
      <StructuredListCell noWrap>
        <FormattedMessage id={labelId} />
      </StructuredListCell>
      <StructuredListCell data-testid={testId}>
        {value === null || value === undefined ? "" : value}
      </StructuredListCell>
    </StructuredListRow>
  );
  const specimen = followUp.specimen;

  return (
    <>
      {notifications.notificationVisible && <AlertDialog />}
      <PageBreadCrumb
        breadcrumbs={[
          { label: "home.label", link: "/" },
          { label: "mod.specimen-followup.menu.title", link: ROUTES.list },
          {
            label: "mod.specimen-followup.detail.title",
            link: ROUTES.detail(followUp.id),
          },
        ]}
      />
      <Grid fullWidth>
        <Column lg={16} md={8} sm={4}>
          <Section>
            <h1 data-testid="followup-detail-title">
              <FormattedMessage id="mod.specimen-followup.detail.title" />{" "}
              {followUp.followUpNumber}{" "}
              <Tag
                type={STATUS_TAG[followUp.status] || "gray"}
                data-testid="followup-status"
              >
                {intl.formatMessage({
                  id: `mod.specimen-followup.status.${followUp.status}`,
                })}
              </Tag>
            </h1>
          </Section>
        </Column>

        <Column lg={8} md={4} sm={4}>
          <h2 className="mod-followup-step">
            <FormattedMessage id="mod.specimen-followup.field.patient" />
          </h2>
          <PatientCard
            patient={followUp.patient || { patientId: followUp.patientId }}
          />
        </Column>
        <Column lg={8} md={4} sm={4}>
          <h2 className="mod-followup-step">
            <FormattedMessage id="mod.specimen-followup.detail.specimen" />
          </h2>
          <StructuredListWrapper aria-label="specimen" isCondensed>
            <StructuredListBody>
              {row(
                "mod.specimen-followup.specimen.accession",
                specimen ? specimen.accessionNumber : followUp.accessionNumber,
                "specimen-accession",
              )}
              {row(
                "mod.specimen-followup.specimen.types",
                specimen ? (specimen.sampleTypes || []).join(", ") : "",
                "specimen-types",
              )}
              {row(
                "mod.specimen-followup.specimen.collected",
                specimen ? specimen.collectionDate : "",
                "specimen-collected",
              )}
              {row(
                "mod.specimen-followup.specimen.received",
                specimen ? specimen.receivedDate : "",
                "specimen-received",
              )}
              {row(
                "mod.specimen-followup.specimen.status",
                specimen ? specimen.status : "",
                "specimen-status",
              )}
            </StructuredListBody>
          </StructuredListWrapper>
        </Column>

        <Column lg={16} md={8} sm={4}>
          <h2 className="mod-followup-step">
            <FormattedMessage id="mod.specimen-followup.detail.action" />
          </h2>
          {!editing && (
            <StructuredListWrapper aria-label="follow-up" isCondensed>
              <StructuredListBody>
                {row(
                  "mod.specimen-followup.field.actionType",
                  followUp.actionTypeLabel,
                  "followup-action-type",
                )}
                {row(
                  "mod.specimen-followup.field.description",
                  followUp.description,
                  "followup-description",
                )}
                {row(
                  "mod.specimen-followup.field.priority",
                  intl.formatMessage({
                    id: `mod.specimen-followup.priority.${followUp.priority}`,
                  }),
                  "followup-priority",
                )}
                {row(
                  "mod.specimen-followup.field.assignee",
                  followUp.assignedUserName,
                  "followup-assignee",
                )}
                {row(
                  "mod.specimen-followup.field.dueDate",
                  isoToSiteDate(followUp.dueDate, dateFormat),
                  "followup-due-date",
                )}
                {row(
                  "mod.specimen-followup.field.notes",
                  followUp.notes ? (
                    <pre className="mod-followup-notes">{followUp.notes}</pre>
                  ) : (
                    ""
                  ),
                  "followup-notes",
                )}
                {row(
                  "mod.specimen-followup.field.created",
                  followUp.createdAt,
                  "followup-created",
                )}
                {row(
                  "mod.specimen-followup.field.lastUpdated",
                  followUp.lastUpdated,
                  "followup-updated",
                )}
              </StructuredListBody>
            </StructuredListWrapper>
          )}
          {editing && form && (
            <Grid narrow>
              <Column lg={8} md={4} sm={4}>
                <Select
                  id="edit-action-type"
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
                  name="edit-priority"
                  valueSelected={form.priority}
                  onChange={(value) => update("priority")(value)}
                >
                  {PRIORITIES.map((priority) => (
                    <RadioButton
                      key={priority}
                      id={`edit-priority-${priority}`}
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
                  id="edit-description"
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
                  id="edit-assignee"
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
                  id="edit-due-date"
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
                  id="edit-notes"
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
                <Button
                  id="followup-save-edit"
                  onClick={saveEdit}
                  disabled={busy}
                >
                  <FormattedMessage id="mod.specimen-followup.form.save" />
                </Button>{" "}
                <Button
                  kind="secondary"
                  onClick={() => setEditing(false)}
                  disabled={busy}
                >
                  <FormattedMessage id="mod.specimen-followup.form.cancel" />
                </Button>
              </Column>
            </Grid>
          )}
        </Column>

        {canManage && !editing && (
          <Column lg={16} md={8} sm={4} className="mod-followup-actions">
            {!followUp.status.match(/COMPLETED|CANCELLED/) && (
              <Button id="followup-edit" kind="tertiary" onClick={startEditing}>
                <FormattedMessage id="mod.specimen-followup.detail.edit" />
              </Button>
            )}{" "}
            {(followUp.allowedTransitions || []).map((target) => (
              <Button
                key={target}
                id={`followup-status-${target}`}
                kind={target === "CANCELLED" ? "danger--tertiary" : "secondary"}
                onClick={() => setStatusTarget(target)}
              >
                {intl.formatMessage({
                  id: `mod.specimen-followup.transition.${target}`,
                })}
              </Button>
            ))}{" "}
            {followUp.deletable && (
              <Button
                id="followup-delete"
                kind="danger"
                onClick={() => setConfirmDelete(true)}
              >
                <FormattedMessage id="mod.specimen-followup.detail.delete" />
              </Button>
            )}
          </Column>
        )}
        <Column lg={16} md={8} sm={4}>
          <Button
            kind="ghost"
            onClick={() => history.push(ROUTES.list)}
            id="followup-back"
          >
            <FormattedMessage id="mod.specimen-followup.detail.back" />
          </Button>
        </Column>
      </Grid>

      <Modal
        open={statusTarget !== null}
        modalHeading={
          statusTarget
            ? intl.formatMessage({
                id: `mod.specimen-followup.transition.${statusTarget}`,
              })
            : ""
        }
        primaryButtonText={intl.formatMessage({
          id: "mod.specimen-followup.form.confirm",
        })}
        secondaryButtonText={intl.formatMessage({
          id: "mod.specimen-followup.form.cancel",
        })}
        primaryButtonDisabled={busy}
        onRequestClose={() => setStatusTarget(null)}
        onRequestSubmit={changeStatus}
        data-testid="followup-status-modal"
      >
        <TextArea
          id="followup-status-note"
          labelText={intl.formatMessage({
            id: "mod.specimen-followup.detail.statusNote",
          })}
          value={statusNote}
          onChange={(event) => setStatusNote(event.target.value)}
        />
      </Modal>
      <Modal
        open={confirmDelete}
        danger
        modalHeading={intl.formatMessage({
          id: "mod.specimen-followup.detail.deleteConfirm",
        })}
        primaryButtonText={intl.formatMessage({
          id: "mod.specimen-followup.detail.delete",
        })}
        secondaryButtonText={intl.formatMessage({
          id: "mod.specimen-followup.form.cancel",
        })}
        primaryButtonDisabled={busy}
        onRequestClose={() => setConfirmDelete(false)}
        onRequestSubmit={remove}
        data-testid="followup-delete-modal"
      >
        <p>
          <FormattedMessage
            id="mod.specimen-followup.detail.deleteWarning"
            values={{ number: followUp.followUpNumber }}
          />
        </p>
      </Modal>
    </>
  );
}
