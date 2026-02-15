"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";
import { QuizQuestion } from "@/lib/types";

interface OptionItem {
  label: string;
  key: string;
}

interface FormState {
  order_index: number;
  question_text: string;
  options: OptionItem[];
  active: boolean;
}

const emptyForm: FormState = {
  order_index: 0,
  question_text: "",
  options: [{ label: "", key: "" }],
  active: true,
};

export default function QuizQuestionsPage() {
  const supabase = createClient();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  async function fetchQuestions() {
    setLoading(true);
    const { data, error } = await supabase
      .from("quiz_questions")
      .select("*")
      .order("order_index");
    if (error) {
      console.error("Error fetching quiz questions:", error);
    } else {
      setQuestions(data || []);
    }
    setLoading(false);
  }

  function handleCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, order_index: questions.length + 1 });
    setShowForm(true);
  }

  function handleEdit(question: QuizQuestion) {
    setEditingId(question.id);
    setForm({
      order_index: question.order_index,
      question_text: question.question_text,
      options: question.options && question.options.length > 0
        ? question.options.map((o: any) => ({ label: o.label, key: o.key }))
        : [{ label: "", key: "" }],
      active: question.active,
    });
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  function handleOptionChange(index: number, field: "label" | "key", value: string) {
    setForm((prev) => {
      const newOptions = [...prev.options];
      newOptions[index] = { ...newOptions[index], [field]: value };
      return { ...prev, options: newOptions };
    });
  }

  function handleAddOption() {
    setForm((prev) => ({
      ...prev,
      options: [...prev.options, { label: "", key: "" }],
    }));
  }

  function handleRemoveOption(index: number) {
    if (form.options.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  }

  async function handleSave() {
    if (!form.question_text.trim()) {
      alert("Question text is required.");
      return;
    }

    const validOptions = form.options.filter(
      (o) => o.label.trim() !== "" && o.key.trim() !== ""
    );

    if (validOptions.length === 0) {
      alert("At least one option with both label and key is required.");
      return;
    }

    setSaving(true);

    const payload = {
      order_index: form.order_index,
      question_text: form.question_text.trim(),
      options: validOptions,
      active: form.active,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error } = await supabase
        .from("quiz_questions")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        console.error("Error updating question:", error);
        alert("Error updating: " + error.message);
      } else {
        setShowForm(false);
        setEditingId(null);
        fetchQuestions();
      }
    } else {
      const { error } = await supabase
        .from("quiz_questions")
        .insert({ ...payload, created_at: new Date().toISOString() });

      if (error) {
        console.error("Error creating question:", error);
        alert("Error creating: " + error.message);
      } else {
        setShowForm(false);
        fetchQuestions();
      }
    }

    setSaving(false);
  }

  async function handleDelete(id: number) {
    setSaving(true);
    const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
    if (error) {
      console.error("Error deleting question:", error);
      alert("Error deleting: " + error.message);
    } else {
      setDeleteConfirmId(null);
      fetchQuestions();
    }
    setSaving(false);
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Quiz Questions</h1>
          {!showForm && (
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-amber-500 text-black font-medium rounded hover:bg-amber-400 transition-colors"
            >
              + New Question
            </button>
          )}
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white">
              {editingId ? "Edit Question" : "New Question"}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Order Index
                </label>
                <input
                  type="number"
                  value={form.order_index}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      order_index: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, active: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-sm text-slate-300">Active</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Question Text
              </label>
              <textarea
                value={form.question_text}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, question_text: e.target.value }))
                }
                rows={3}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                placeholder="Enter your question text..."
              />
            </div>

            {/* Options Editor */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-slate-300">Options</label>
                <button
                  onClick={handleAddOption}
                  className="px-3 py-1 bg-slate-700 text-slate-300 text-sm rounded hover:bg-slate-600 transition-colors border border-slate-600"
                >
                  + Add Option
                </button>
              </div>
              <div className="space-y-2">
                {form.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-slate-500 text-sm w-6 text-right">
                      {index + 1}.
                    </span>
                    <input
                      type="text"
                      value={option.label}
                      onChange={(e) =>
                        handleOptionChange(index, "label", e.target.value)
                      }
                      placeholder="Label (display text)"
                      className="flex-1 bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                    />
                    <input
                      type="text"
                      value={option.key}
                      onChange={(e) =>
                        handleOptionChange(index, "key", e.target.value)
                      }
                      placeholder="Key (value)"
                      className="w-40 bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={() => handleRemoveOption(index)}
                      disabled={form.options.length <= 1}
                      className="p-2 text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Remove option"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-amber-500 text-black font-medium rounded hover:bg-amber-400 disabled:opacity-50 transition-colors"
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Question"
                  : "Create Question"}
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Questions Table */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">
              Loading quiz questions...
            </div>
          ) : questions.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No quiz questions found. Create your first question above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-300 w-16">
                      Order
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">
                      Question
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-300 w-24">
                      Options
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-300 w-24">
                      Status
                    </th>
                    <th className="px-4 py-3 w-40"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {questions.map((question) => (
                    <tr key={question.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-white font-mono text-center">
                        {question.order_index}
                      </td>
                      <td className="px-4 py-3 text-white">
                        <p className="line-clamp-2">{question.question_text}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-center">
                        {question.options ? question.options.length : 0}
                      </td>
                      <td className="px-4 py-3">
                        {question.active ? (
                          <span className="inline-flex items-center gap-1 text-green-400 text-sm">
                            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500 text-sm">
                            <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(question)}
                            className="px-3 py-1 bg-slate-700 text-slate-300 text-sm rounded hover:bg-slate-600 transition-colors"
                          >
                            Edit
                          </button>
                          {deleteConfirmId === question.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(question.id)}
                                disabled={saving}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-500 disabled:opacity-50 transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-3 py-1 bg-slate-700 text-slate-300 text-sm rounded hover:bg-slate-600 transition-colors"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(question.id)}
                              className="px-3 py-1 bg-red-900/50 text-red-400 text-sm rounded hover:bg-red-900 transition-colors"
                            >
                              Delete
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
    </AdminShell>
  );
}
