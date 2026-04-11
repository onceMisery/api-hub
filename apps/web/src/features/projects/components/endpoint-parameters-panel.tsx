import { EditorPanel, Field } from "./endpoint-editor-shared";

type ParameterRow = {
  sectionType: string;
  name: string;
  dataType: string;
  required: boolean;
  description: string;
  exampleValue: string;
};

type EndpointParametersPanelProps = {
  parameterRows: ParameterRow[];
  parameterMessage: string | null;
  canSave: boolean;
  onAddRow: () => void;
  onUpdateRow: <K extends keyof ParameterRow>(index: number, field: K, value: ParameterRow[K]) => void;
  onRemoveRow: (index: number) => void;
  onSave: () => void;
};

export function EndpointParametersPanel({
  parameterRows,
  parameterMessage,
  canSave,
  onAddRow,
  onUpdateRow,
  onRemoveRow,
  onSave
}: EndpointParametersPanelProps) {
  return (
    <EditorPanel title="Request Parameters">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Flat rows for query, path, header, or body fields.</p>
          <button
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
            disabled={!canSave}
            onClick={onAddRow}
            type="button"
          >
            Add parameter row
          </button>
        </div>

        <div className="space-y-3">
          {parameterRows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-sm text-slate-500">
              No request parameters yet.
            </p>
          ) : (
            parameterRows.map((parameter, index) => (
              <div key={`parameter-${index}`} className="grid gap-3 rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label={`Parameter ${index + 1} name`}>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                    disabled={!canSave}
                    onChange={(event) => onUpdateRow(index, "name", event.target.value)}
                    value={parameter.name}
                  />
                </Field>
                <Field label={`Parameter ${index + 1} type`}>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                    disabled={!canSave}
                    onChange={(event) => onUpdateRow(index, "dataType", event.target.value)}
                    value={parameter.dataType}
                  />
                </Field>
                <Field label={`Parameter ${index + 1} section`}>
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                    disabled={!canSave}
                    onChange={(event) => onUpdateRow(index, "sectionType", event.target.value)}
                    value={parameter.sectionType}
                  >
                    {["query", "path", "header", "body"].map((sectionType) => (
                      <option key={sectionType} value={sectionType}>
                        {sectionType}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={`Parameter ${index + 1} example`}>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                    disabled={!canSave}
                    onChange={(event) => onUpdateRow(index, "exampleValue", event.target.value)}
                    value={parameter.exampleValue}
                  />
                </Field>
                <Field label={`Parameter ${index + 1} description`}>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                    disabled={!canSave}
                    onChange={(event) => onUpdateRow(index, "description", event.target.value)}
                    value={parameter.description}
                  />
                </Field>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <input
                    checked={parameter.required}
                    disabled={!canSave}
                    onChange={(event) => onUpdateRow(index, "required", event.target.checked)}
                    type="checkbox"
                  />
                  Required
                </label>
                <div className="flex items-end">
                  <button
                    className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                    disabled={!canSave}
                    onClick={() => onRemoveRow(index)}
                    type="button"
                  >
                    Remove parameter row {index + 1}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={!canSave}
            onClick={onSave}
            type="button"
          >
            Save parameters
          </button>
          {parameterMessage ? <p className="text-sm text-emerald-600">{parameterMessage}</p> : null}
        </div>
      </div>
    </EditorPanel>
  );
}
