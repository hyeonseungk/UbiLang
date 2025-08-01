"use client";

import { Button } from "@/components/ui/button";
import { showError } from "@/lib/error-store";
import { useT } from "@/lib/i18n";
import { useLangStore } from "@/lib/i18n-store";
import { showSimpleSuccess } from "@/lib/success-store";
import { supabase } from "@/lib/supabase-browser";
import { Tables } from "@/types/database";
import { useState } from "react";

interface Recommendation {
  contents: string;
  selected: boolean;
}

interface PolicyAiRecommendationModalProps {
  projectId: string;
  userId: string;
  selectedFeatureId: string;
  onClose: () => void;
  onPoliciesAdded: (
    newPolicies: (Tables<"policies"> & {
      policy_links: any[];
      policy_terms: any[];
      feature_policies: any[];
    })[]
  ) => void;
}

export default function PolicyAiRecommendationModal({
  projectId,
  userId,
  selectedFeatureId,
  onClose,
  onPoliciesAdded,
}: PolicyAiRecommendationModalProps) {
  const t = useT();
  const { locale } = useLangStore();

  const [aiRecommendations, setAiRecommendations] = useState<Recommendation[]>(
    []
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAiRecommendation = async () => {
    setAiRecommendations([]);
    setAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-policy-recommendation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            projectId,
            count: 5,
            language: locale,
            selectedFeatureId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data?.recommendations) {
        setAiRecommendations(
          result.data.recommendations.map((rec: any) => ({
            ...rec,
            selected: false,
          }))
        );
      } else {
        throw new Error(result.error || t("policy.ai_error"));
      }
    } catch (err) {
      console.error("AI recommendation error:", err);
      setAiError(err instanceof Error ? err.message : t("policy.ai_error"));
    } finally {
      setAiLoading(false);
    }
  };

  const toggleRecommendationSelection = (index: number) => {
    setAiRecommendations((prev) =>
      prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r))
    );
  };

  const addSelectedRecommendations = async () => {
    const selected = aiRecommendations.filter((r) => r.selected);
    if (!selected.length) return;

    setAiLoading(true);
    try {
      const addedPolicies: (Tables<"policies"> & {
        policy_links: any[];
        policy_terms: any[];
        feature_policies: any[];
      })[] = [];
      for (const rec of selected) {
        const { data: policy, error: policyError } = await supabase
          .from("policies")
          .insert({
            project_id: projectId,
            contents: rec.contents,
            author_id: userId,
          })
          .select()
          .single();
        if (policyError) throw policyError;
        // Link the new policy to the selected feature
        const { data: featurePolicy, error: featurePolicyError } =
          await supabase
            .from("feature_policies")
            .insert({ feature_id: selectedFeatureId, policy_id: policy.id })
            .select()
            .single();
        if (featurePolicyError) throw featurePolicyError;
        addedPolicies.push({
          ...policy,
          policy_links: [],
          policy_terms: [],
          feature_policies: [featurePolicy],
        });
      }
      onPoliciesAdded(addedPolicies);
      setAiRecommendations((prev) => prev.filter((r) => !r.selected));
      showSimpleSuccess(`${selected.length}${t("policy.ai_policies_added")}`);
      if (aiRecommendations.filter((r) => !r.selected).length === 0) {
        onClose();
      }
    } catch (err) {
      console.error("Error adding recommended policies:", err);
      showError(t("policy.add_error_title"), t("policy.add_error_desc"));
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          {t("policy.ai_modal_title")}
        </h3>

        {/* initial / loading state */}
        {aiRecommendations.length === 0 && !aiError && (
          <>
            {!aiLoading && (
              <p className="text-muted-foreground mb-6">
                {t("policy.ai_modal_desc")}
              </p>
            )}

            {aiLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">
                  {t("policy.ai_loading")}
                </p>
              </div>
            )}

            {!aiLoading && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  {t("buttons.close")}
                </Button>
                <Button onClick={handleAiRecommendation} disabled={aiLoading}>
                  {t("policy.ai_get_recommendations")}
                </Button>
              </div>
            )}
          </>
        )}

        {/* error state */}
        {aiError && (
          <>
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{aiError}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                {t("buttons.close")}
              </Button>
              <Button onClick={handleAiRecommendation} disabled={aiLoading}>
                {t("policy.ai_retry")}
              </Button>
            </div>
          </>
        )}

        {/* recommendations list */}
        {aiRecommendations.length > 0 && !aiError && (
          <>
            <p className="text-muted-foreground mb-4">
              {t("policy.ai_select_policies")}
              {aiRecommendations.some((r) => r.selected) &&
                ` (${
                  aiRecommendations.filter((r) => r.selected).length
                }개 선택됨)`}
            </p>

            <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
              {aiRecommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    rec.selected
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => toggleRecommendationSelection(index)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
                        rec.selected
                          ? "bg-primary border-primary text-white"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRecommendationSelection(index);
                      }}
                    >
                      {rec.selected && (
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <div
                      className="flex-1"
                      onClick={() => toggleRecommendationSelection(index)}
                    >
                      <p className="text-sm text-muted-foreground mb-2">
                        {rec.contents}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={onClose} disabled={aiLoading}>
                {t("buttons.close")}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleAiRecommendation}
                  disabled={aiLoading}
                >
                  {t("policy.ai_retry")}
                </Button>
                <Button
                  onClick={addSelectedRecommendations}
                  disabled={
                    aiLoading ||
                    aiRecommendations.filter((r) => r.selected).length === 0
                  }
                >
                  {aiLoading
                    ? t("common.processing")
                    : `${t("policy.ai_add_selected")} (${
                        aiRecommendations.filter((r) => r.selected).length
                      })`}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
