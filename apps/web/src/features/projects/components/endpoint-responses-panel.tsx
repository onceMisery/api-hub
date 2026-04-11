import { EditorPanel, Field } from "./endpoint-editor-shared";

type ResponseRow = {
  httpStatusCode: number;
  mediaType: string;
  name: string;
  dataType: string;
  required: boolean;
  description: string;
  exampleValue: string;
};

type EndpointResponsesPanelProps = {
  responseRows: ResponseRow[];
  responseMessage: string | null;
  canSave: boolean;
  onAddRow: () => void;
  onUpdateRow: <K extends keyof ResponseRow>(index: number, field: K, value: ResponseRow[K]) => void;
  onRemoveRow: (index: number) => void;
  onSave: () => void;
};

export function EndpointResponsesPanel({
  responseRows,
  responseMessage,
  canSave,
  onAddRow,
  onUpdateRow,
  onRemoveRow,
  onSave
}: EndpointResponsesPanelProps) {
  return (
    <EditorPanel title="Response Structure">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Flat response fields with status code and media type.</p>
          <button
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
            onClick={onAddRow}
            type="button"
          >
            Add response row
          </button>
        </div>

        <div className="space-y-3">
          {responseRows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-sm text-slate-500">
              No response fields yet.
            </p>
          ) : (
            responseRows.map((response, index) => (
              <div key={`response-${index}`} className="grid gap-3 rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label={`Response ${index + 1} name`}>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                    onChange={(event) => onUpdateRow(index, "name", event.target.value)}
                    value={response.name}
                  />
                </Field>
                <Field label={`Response ${index + 1} type`}>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                    onChange={(event) => onUpdateRow(index, "dataType", event.target.value)}
                    value={response.dataType}
                  />
                </Field>
                <Field label={`Response ${index + 1} status`}>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                    onChange={(event) => onUpdateRow(index, "httpStatusCode", Number(event.target.value) || 200)}
                    value={response.httpStatusCode}
                  />
                </Field>
                <Field label={`Response ${index + 1} media type`}>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                    onChange={(event) => onUpdateRow(index, "mediaType", event.target.value)}
                    value={response.mediaType}
                  />
                </Field>
                <Field label={`Response ${index + 1} description`}>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                    onChange={(event) => onUpdateRow(index, "description", event.target.value)}
                    value={response.description}
                  />
                </Field>
                <Field label={`Response ${index + 1} example`}>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                    onChange={(event) => onUpdateRow(index, "exampleValue", event.target.value)}
                    value={response.exampleValue}
                  />
                </Field>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <input
                    checked={response.required}
                    onChange={(event) => onUpdateRow(index, "required", event.target.checked)}
                    type="checkbox"
                  />
                  Required
                </label>
                <div className="flex items-end">
                  <button
                    className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                    onClick={() => onRemoveRow(index)}
                    type="button"
                  >
                    Remove response row {index + 1}
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
            Save responses
          </button>
          {responseMessage ? <p className="text-sm text-emerald-600">{responseMessage}</p> : null}
        </div>
      </div>
    </EditorPanel>
  );
}
