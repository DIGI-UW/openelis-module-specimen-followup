import React from "react";
import { Button, Tile } from "@carbon/react";
import { FormattedMessage } from "react-intl";

/** The selected (or referenced) patient, as the core returned it, with an optional "change" action. */
export default function PatientCard({ patient, onClear }) {
  if (!patient) {
    return null;
  }
  const name = [patient.lastName, patient.firstName].filter(Boolean).join(", ");
  return (
    <Tile data-testid="followup-patient-card" className="mod-followup-patient">
      <strong>{name || patient.patientId}</strong>
      <div>
        <FormattedMessage id="mod.specimen-followup.patient.id" />: {patient.patientId}
        {patient.nationalId ? ` · ${patient.nationalId}` : ""}
        {patient.subjectNumber ? ` · ${patient.subjectNumber}` : ""}
      </div>
      <div>
        {patient.gender ? <span>{patient.gender} · </span> : null}
        {patient.birthDate || patient.birthDateForDisplay || ""}
      </div>
      {onClear && (
        <Button kind="ghost" size="sm" onClick={onClear} data-testid="followup-change-patient">
          <FormattedMessage id="mod.specimen-followup.create.changePatient" />
        </Button>
      )}
    </Tile>
  );
}
