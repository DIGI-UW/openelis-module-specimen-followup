import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import {
  Button,
  Column,
  DataTable,
  Grid,
  InlineNotification,
  Loading,
  Pagination,
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
  Tag,
  TextInput,
} from "@carbon/react";
import { PageBreadCrumb } from "openelis_core/components";
import {
  useConfigurationProperties,
  useOpenElisApi,
  usePermission,
} from "openelis_core/sdk";
import { isoToSiteDate, siteDateFormat } from "../followUpApi";
import { ROUTES, endpoints, PRIORITIES, STATUSES } from "../followUpApi";

const STATUS_TAG = {
  OPEN: "blue",
  IN_PROGRESS: "teal",
  COMPLETED: "green",
  CANCELLED: "gray",
};

const PRIORITY_TAG = { LOW: "gray", NORMAL: "cyan", HIGH: "red" };

const EMPTY_FILTERS = {
  followUpNumber: "",
  patientId: "",
  accessionNumber: "",
  actionType: "",
  priority: "",
  status: "",
};

/**
 * Every follow-up the module recorded, searchable by identifier, patient and
 * accession number and filterable by type, priority and status. Server paging:
 * the page the table shows is the page the API returned.
 */
export default function FollowUpListPage() {
  const intl = useIntl();
  const dateFormat = siteDateFormat(useConfigurationProperties());
  const history = useHistory();
  const api = useOpenElisApi();
  const canManage = usePermission("mod.specimen-followup.manage");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(false);
  const [options, setOptions] = useState({ actionTypes: [] });

  useEffect(() => {
    api
      .get(endpoints.options)
      .then(setOptions)
      .catch(() => setOptions({ actionTypes: [] }));
  }, [api]);

  const load = useCallback(() => {
    setError(false);
    api
      .get(endpoints.followUps({ ...applied, page, size }))
      .then((body) => setResult(body))
      .catch(() => {
        setResult({ items: [], total: 0, page: 0, size });
        setError(true);
      });
  }, [api, applied, page, size]);

  useEffect(() => {
    load();
  }, [load]);

  const headers = useMemo(
    () => [
      {
        key: "followUpNumber",
        header: intl.formatMessage({
          id: "mod.specimen-followup.field.number",
        }),
      },
      {
        key: "patient",
        header: intl.formatMessage({
          id: "mod.specimen-followup.field.patient",
        }),
      },
      {
        key: "accessionNumber",
        header: intl.formatMessage({
          id: "mod.specimen-followup.specimen.accession",
        }),
      },
      {
        key: "actionType",
        header: intl.formatMessage({
          id: "mod.specimen-followup.field.actionType",
        }),
      },
      {
        key: "priority",
        header: intl.formatMessage({
          id: "mod.specimen-followup.field.priority",
        }),
      },
      {
        key: "status",
        header: intl.formatMessage({
          id: "mod.specimen-followup.field.status",
        }),
      },
      {
        key: "assignedUserName",
        header: intl.formatMessage({
          id: "mod.specimen-followup.field.assignee",
        }),
      },
      {
        key: "dueDate",
        header: intl.formatMessage({
          id: "mod.specimen-followup.field.dueDate",
        }),
      },
    ],
    [intl],
  );

  const rows = (result ? result.items : []).map((item) => ({
    id: String(item.id),
    followUpNumber: item.followUpNumber,
    patient: item.patient
      ? [item.patient.lastName, item.patient.firstName]
          .filter(Boolean)
          .join(", ") || item.patientId
      : item.patientId,
    accessionNumber: item.accessionNumber || "",
    actionType: item.actionTypeLabel || item.actionType,
    priority: item.priority,
    status: item.status,
    assignedUserName: item.assignedUserName || "",
    dueDate: isoToSiteDate(item.dueDate, dateFormat),
  }));

  const setFilter = (field) => (event) => {
    const value = event && event.target ? event.target.value : event;
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const search = (event) => {
    if (event) {
      event.preventDefault();
    }
    setPage(0);
    setApplied(filters);
  };

  const reset = () => {
    setFilters(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(0);
  };

  return (
    <>
      <PageBreadCrumb
        breadcrumbs={[
          { label: "home.label", link: "/" },
          { label: "mod.specimen-followup.menu.title", link: ROUTES.list },
        ]}
      />
      <Grid fullWidth>
        <Column lg={16} md={8} sm={4}>
          <Section>
            <h1 data-testid="followup-list-title">
              <FormattedMessage id="mod.specimen-followup.list.title" />
            </h1>
          </Section>
        </Column>
        <Column lg={16} md={8} sm={4}>
          <form onSubmit={search} className="mod-followup-filters">
            <Grid narrow>
              <Column lg={4} md={4} sm={4}>
                <TextInput
                  id="filter-number"
                  labelText={intl.formatMessage({
                    id: "mod.specimen-followup.field.number",
                  })}
                  value={filters.followUpNumber}
                  onChange={setFilter("followUpNumber")}
                />
              </Column>
              <Column lg={4} md={4} sm={4}>
                <TextInput
                  id="filter-patient"
                  labelText={intl.formatMessage({
                    id: "mod.specimen-followup.list.filter.patientId",
                  })}
                  value={filters.patientId}
                  onChange={setFilter("patientId")}
                />
              </Column>
              <Column lg={4} md={4} sm={4}>
                <TextInput
                  id="filter-accession"
                  labelText={intl.formatMessage({
                    id: "mod.specimen-followup.specimen.accession",
                  })}
                  value={filters.accessionNumber}
                  onChange={setFilter("accessionNumber")}
                />
              </Column>
              <Column lg={4} md={4} sm={4}>
                <Select
                  id="filter-type"
                  labelText={intl.formatMessage({
                    id: "mod.specimen-followup.field.actionType",
                  })}
                  value={filters.actionType}
                  onChange={setFilter("actionType")}
                >
                  <SelectItem
                    value=""
                    text={intl.formatMessage({
                      id: "mod.specimen-followup.list.filter.any",
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
              <Column lg={4} md={4} sm={4}>
                <Select
                  id="filter-priority"
                  labelText={intl.formatMessage({
                    id: "mod.specimen-followup.field.priority",
                  })}
                  value={filters.priority}
                  onChange={setFilter("priority")}
                >
                  <SelectItem
                    value=""
                    text={intl.formatMessage({
                      id: "mod.specimen-followup.list.filter.any",
                    })}
                  />
                  {PRIORITIES.map((priority) => (
                    <SelectItem
                      key={priority}
                      value={priority}
                      text={intl.formatMessage({
                        id: `mod.specimen-followup.priority.${priority}`,
                      })}
                    />
                  ))}
                </Select>
              </Column>
              <Column lg={4} md={4} sm={4}>
                <Select
                  id="filter-status"
                  labelText={intl.formatMessage({
                    id: "mod.specimen-followup.field.status",
                  })}
                  value={filters.status}
                  onChange={setFilter("status")}
                >
                  <SelectItem
                    value=""
                    text={intl.formatMessage({
                      id: "mod.specimen-followup.list.filter.any",
                    })}
                  />
                  {STATUSES.map((status) => (
                    <SelectItem
                      key={status}
                      value={status}
                      text={intl.formatMessage({
                        id: `mod.specimen-followup.status.${status}`,
                      })}
                    />
                  ))}
                </Select>
              </Column>
              <Column
                lg={8}
                md={8}
                sm={4}
                className="mod-followup-filter-actions"
              >
                <Button type="submit" id="followup-search">
                  <FormattedMessage id="mod.specimen-followup.list.search" />
                </Button>{" "}
                <Button kind="secondary" onClick={reset} id="followup-reset">
                  <FormattedMessage id="mod.specimen-followup.list.reset" />
                </Button>{" "}
                {canManage && (
                  <Button
                    kind="tertiary"
                    onClick={() => history.push(ROUTES.create)}
                    id="followup-new"
                  >
                    <FormattedMessage id="mod.specimen-followup.menu.create" />
                  </Button>
                )}
              </Column>
            </Grid>
          </form>
        </Column>
        <Column lg={16} md={8} sm={4}>
          {error && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title={intl.formatMessage({
                id: "mod.specimen-followup.list.failed",
              })}
            />
          )}
          {result === null && <Loading withOverlay={false} />}
          {result && result.items.length === 0 && !error && (
            <p data-testid="followup-list-empty">
              <FormattedMessage id="mod.specimen-followup.list.empty" />
            </p>
          )}
          {result && result.items.length > 0 && (
            <>
              <DataTable rows={rows} headers={headers}>
                {({
                  rows: tableRows,
                  headers: tableHeaders,
                  getHeaderProps,
                  getRowProps,
                  getTableProps,
                }) => (
                  <TableContainer>
                    <Table {...getTableProps()} size="md">
                      <TableHead>
                        <TableRow>
                          {tableHeaders.map((header) => (
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
                        {tableRows.map((row) => (
                          <TableRow
                            {...getRowProps({ row })}
                            key={row.id}
                            data-testid={`followup-row-${row.id}`}
                          >
                            {row.cells.map((cell) => (
                              <TableCell key={cell.id}>
                                {cell.info.header === "followUpNumber" ? (
                                  <Link to={ROUTES.detail(row.id)}>
                                    {cell.value}
                                  </Link>
                                ) : cell.info.header === "status" ? (
                                  <Tag
                                    type={STATUS_TAG[cell.value] || "gray"}
                                    size="sm"
                                  >
                                    {intl.formatMessage({
                                      id: `mod.specimen-followup.status.${cell.value}`,
                                    })}
                                  </Tag>
                                ) : cell.info.header === "priority" ? (
                                  <Tag
                                    type={PRIORITY_TAG[cell.value] || "gray"}
                                    size="sm"
                                  >
                                    {intl.formatMessage({
                                      id: `mod.specimen-followup.priority.${cell.value}`,
                                    })}
                                  </Tag>
                                ) : (
                                  cell.value
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </DataTable>
              <Pagination
                page={result.page + 1}
                pageSize={result.size}
                pageSizes={[10, 20, 50]}
                totalItems={result.total}
                onChange={({ page: nextPage, pageSize }) => {
                  if (pageSize !== size) {
                    setSize(pageSize);
                    setPage(0);
                  } else {
                    setPage(nextPage - 1);
                  }
                }}
              />
            </>
          )}
        </Column>
      </Grid>
    </>
  );
}
