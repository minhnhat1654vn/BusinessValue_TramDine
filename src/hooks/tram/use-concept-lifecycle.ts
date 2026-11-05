"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { emitTramEvent } from "@/lib/tram/events";

export function useConceptLifecycle(initialOpenConceptModal = false) {
  const [concepts, setConcepts] = useState<any[]>([]);
  const [activeConceptId, setActiveConceptId] = useState<string>("concept-2");
  const [selectedConceptId, setSelectedConceptId] = useState<string>("concept-2");
  const [createConceptOpen, setCreateConceptOpen] = useState(initialOpenConceptModal);
  const [editConceptOpen, setEditConceptOpen] = useState(false);
  const [conceptToEdit, setConceptToEdit] = useState<any | null>(null);
  const [manageConceptsOpen, setManageConceptsOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [conceptToDelete, setConceptToDelete] = useState<any | null>(null);
  const [deletingConcept, setDeletingConcept] = useState(false);
  const [activatingConcept, setActivatingConcept] = useState(false);

  useEffect(() => {
    if (initialOpenConceptModal) {
      setCreateConceptOpen(true);
    }
  }, [initialOpenConceptModal]);

  const loadConcepts = useCallback(async () => {
    try {
      const res = await fetch("/api/recipes/concepts");
      if (res.ok) {
        const data = await res.json();
        setConcepts(data.concepts || []);
        if (data.activeId) setActiveConceptId(data.activeId);
      }
    } catch (err) {
      console.error("Error loading concepts:", err);
    }
  }, []);

  useEffect(() => {
    loadConcepts();
  }, [loadConcepts]);

  const notifyConceptActivated = useCallback((conceptId: string) => {
    emitTramEvent({ type: "CONCEPT_ACTIVATED", conceptId });
  }, []);

  const handleConfirmDeleteConcept = useCallback(
    async (onDeletedFallback?: (nextId: string) => void) => {
      if (!conceptToDelete) return;
      try {
        setDeletingConcept(true);
        const res = await fetch("/api/recipes/concepts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", conceptId: conceptToDelete.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Không thể xóa Concept");
        toast.success(data.message || "Đã xóa Concept thành công!");
        await loadConcepts();
        if (selectedConceptId === conceptToDelete.id) {
          setSelectedConceptId(activeConceptId);
          onDeletedFallback?.(activeConceptId);
        }
        setDeleteAlertOpen(false);
        setConceptToDelete(null);
      } catch (err: any) {
        toast.error(err.message || "Lỗi khi xóa Concept");
      } finally {
        setDeletingConcept(false);
      }
    },
    [conceptToDelete, loadConcepts, selectedConceptId, activeConceptId],
  );

  return {
    concepts,
    setConcepts,
    activeConceptId,
    setActiveConceptId,
    selectedConceptId,
    setSelectedConceptId,
    createConceptOpen,
    setCreateConceptOpen,
    editConceptOpen,
    setEditConceptOpen,
    conceptToEdit,
    setConceptToEdit,
    manageConceptsOpen,
    setManageConceptsOpen,
    deleteAlertOpen,
    setDeleteAlertOpen,
    conceptToDelete,
    setConceptToDelete,
    deletingConcept,
    activatingConcept,
    setActivatingConcept,
    loadConcepts,
    notifyConceptActivated,
    handleConfirmDeleteConcept,
  };
}
