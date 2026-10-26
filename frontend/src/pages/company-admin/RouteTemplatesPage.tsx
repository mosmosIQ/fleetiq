
import { FormEvent, useEffect, useState } from "react";
import {
  archiveRouteTemplate,
  createRouteTemplate,
  listRouteTemplates,
  updateRouteTemplate,
  RouteTemplate,
  RouteDirection
} from "../../services/routeTemplateService";

export default function RouteTemplatesPage() {
  const [templates, setTemplates] = useState<RouteTemplate[]>([]);
  const [name, setName] = useState("");
  const [direction, setDirection] =
    useState<RouteDirection>("NORTHBOUND");
  const [checkpoints, setCheckpoints] = useState<string[]>([
    "",
    ""
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadTemplates() {
    try {
      setLoading(true);
      const data = await listRouteTemplates();
      setTemplates(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load route templates"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTemplates();
  }, []);

  function resetForm() {
    setName("");
    setDirection("NORTHBOUND");
    setCheckpoints(["", ""]);
    setEditingId(null);
  }

  function addCheckpoint() {
    setCheckpoints(current => [...current, ""]);
  }

  function changeCheckpoint(index: number, value: string) {
    setCheckpoints(current =>
      current.map((checkpoint, i) =>
        i === index ? value : checkpoint
      )
    );
  }

  function removeCheckpoint(index: number) {
    setCheckpoints(current =>
      current.filter((_, i) => i !== index)
    );
  }

  function moveCheckpoint(index: number, offset: number) {
    setCheckpoints(current => {
      const next = [...current];
      const target = index + offset;

      if (target < 0 || target >= next.length) return current;

      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function startEditing(template: RouteTemplate) {
    setEditingId(template.id);
    setName(template.name);
    setDirection(template.direction);
    setCheckpoints([...template.checkpoints]);
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const cleaned = checkpoints.map(item => item.trim()).filter(Boolean);

    if (name.trim().length < 2) {
      setError("Enter a route name.");
      return;
    }

    if (cleaned.length < 2) {
      setError("Enter at least two checkpoints.");
      return;
    }

    if (new Set(cleaned.map(item => item.toLowerCase())).size !== cleaned.length) {
      setError("Remove duplicate checkpoint names.");
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        await updateRouteTemplate(editingId, {
          name: name.trim(),
          checkpoints: cleaned
        });
        setSuccess("Route template updated.");
      } else {
        await createRouteTemplate({
          name: name.trim(),
          direction,
          checkpoints: cleaned
        });
        setSuccess("Route template created.");
      }

      resetForm();
      await loadTemplates();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Could not save the route template"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(template: RouteTemplate) {
    if (!window.confirm(`Archive route "${template.name}"?`)) return;

    try {
      setError("");
      setSuccess("");
      await archiveRouteTemplate(template.id);
      setSuccess(`"${template.name}" has been archived.`);
      await loadTemplates();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Could not archive route"
      );
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Route Templates</h1>
          <p>
            Create reusable Northbound and Southbound routes with
            checkpoints defined by your company.
          </p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="card">
        <div className="card-header">
          <div>
            <h2>{editingId ? "Edit Route Template" : "Create Route Template"}</h2>
            <p>Checkpoints are recorded in the order the truck is expected to pass them.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          <div>
            <label>Route name</label>
            <input
              className="input"
              value={name}
              maxLength={150}
              onChange={event => setName(event.target.value)}
              placeholder="e.g. Dar es Salaam to destination"
              required
            />
          </div>

          <div>
            <label>Direction</label>
            <select
              className="input"
              value={direction}
              disabled={Boolean(editingId)}
              onChange={event =>
                setDirection(event.target.value as RouteDirection)
              }
            >
              <option value="NORTHBOUND">Northbound</option>
              <option value="SOUTHBOUND">Southbound</option>
            </select>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label>Checkpoints</label>

            {checkpoints.map((checkpoint, index) => (
              <div
                key={index}
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px minmax(0, 1fr) auto auto auto",
                  gap: 8,
                  alignItems: "center",
                  marginTop: 8
                }}
              >
                <strong>{index + 1}.</strong>

                <input
                  className="input"
                  value={checkpoint}
                  maxLength={150}
                  onChange={event =>
                    changeCheckpoint(index, event.target.value)
                  }
                  placeholder={`Checkpoint ${index + 1}`}
                  required
                />

                <button
                  type="button"
                  className="button"
                  disabled={index === 0}
                  onClick={() => moveCheckpoint(index, -1)}
                  title="Move up"
                >
                  ↑
                </button>

                <button
                  type="button"
                  className="button"
                  disabled={index === checkpoints.length - 1}
                  onClick={() => moveCheckpoint(index, 1)}
                  title="Move down"
                >
                  ↓
                </button>

                <button
                  type="button"
                  className="button button-danger"
                  disabled={checkpoints.length <= 2}
                  onClick={() => removeCheckpoint(index)}
                  title="Remove checkpoint"
                >
                  ×
                </button>
              </div>
            ))}

            <button
              type="button"
              className="button"
              style={{ marginTop: 12 }}
              disabled={checkpoints.length >= 100}
              onClick={addCheckpoint}
            >
              + Add checkpoint
            </button>
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
            <button className="button" type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : editingId
                  ? "Save Changes"
                  : "Create Route Template"}
            </button>

            {editingId && (
              <button
                type="button"
                className="button"
                onClick={resetForm}
              >
                Cancel Editing
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2>Saved Routes</h2>
            <p>Manage the route templates available to your company.</p>
          </div>
        </div>

        {loading ? (
          <p>Loading route templates...</p>
        ) : templates.length === 0 ? (
          <p>No route templates created yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Direction</th>
                  <th>Checkpoints</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {templates.map(template => (
                  <tr key={template.id}>
                    <td>{template.name}</td>
                    <td>{template.direction}</td>
                    <td>
                      <ol style={{ margin: 0, paddingLeft: 20 }}>
                        {template.checkpoints.map((checkpoint, index) => (
                          <li key={`${template.id}-${index}`}>
                            {checkpoint}
                          </li>
                        ))}
                      </ol>
                    </td>
                    <td>{template.is_active ? "Active" : "Archived"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="button"
                          disabled={!template.is_active}
                          onClick={() => startEditing(template)}
                        >
                          Edit
                        </button>
                        {template.is_active && (
                          <button
                            type="button"
                            className="button button-danger"
                            onClick={() => handleArchive(template)}
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
