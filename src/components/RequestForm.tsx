"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormContext } from "@/context/FormContext";
import UniversitySelect from "@/components/UniversitySelect";
import universitiesBySubregion from "@/data/universities_by_subregion.json";

const allResearcherLevels = [
  "教授", "准教授", "助教", "講師", "助教授", "助手",
  "研究員", "特任助教", "主任研究員", "特任教授",
];

type FormDataType = {
  category: string;
  title: string;
  background: string;
  industry: string;        // ✅追加
  businessDescription: string; // ✅追加
  university: string[];      // ✅追加
  researchField: string;
  researcherLevel: string[];
  deadline: string;
};

type RequestFormProps = {
  onSubmit?: (data: FormDataType) => void;
};

export default function RequestForm({ onSubmit }: RequestFormProps) {
  const router = useRouter();
  const { formData, setFormData } = useFormContext();

  const initialData: FormDataType = {
    category: "",
    title: "",
    background: "",
    industry: "",
    businessDescription: "",
    university: [],
    researchField: "",
    researcherLevel: [...allResearcherLevels],
    deadline: "",
  };

  const [localFormData, setLocalFormData] = useState<FormDataType>(formData || initialData);
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false); // ←診断中に「しばらくお待ちください。」を表示するため
  const [validationError, setValidationError] = useState<string | null>(null); // ←AIアシストのため５つの項目すべてに入力してもらう注意を表示するため

  // ✅ モーダル表示と診断結果を管理
  const [showModal, setShowModal] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<string | null>(null);

  // ✅ 選択した大学を formData に反映
  useEffect(() => {
    if (JSON.stringify(formData.university) !== JSON.stringify(selectedUniversities)) {
      setFormData(prev => ({ ...prev, university: selectedUniversities }));
    }
  }, [selectedUniversities]);

  // ✅ formData をもとに localFormData や selectedUniversities を初期化
  useEffect(() => {
  setLocalFormData(formData);

    let universityArray =
    Array.isArray(formData.university)
      ? formData.university
      : formData.university
      ? [formData.university]
      : [];

  // ✅ "全大学" が含まれていたら、85校に展開
  if (universityArray.includes("全大学")) {
    const universityList85 = Object.values(universitiesBySubregion).flat();
    setSelectedUniversities(universityList85);
  } else {
    setSelectedUniversities(universityArray);
  }
}, []);

  const handleDiagnosis = async () => {
    console.log("送信内容", localFormData);

    // 必須5項目の簡易バリデーション
    if (
      !localFormData.category ||
      !localFormData.title ||
      !localFormData.background ||
      !localFormData.industry ||
      !localFormData.businessDescription
    ) {
      setValidationError("必須項目（上段5項目）をすべて入力してください。");
      return;
    }

    setLoading(true); // ← しばらくお待ちください。の表示のため

    try {
      const response = await fetch("https://app-advanced3-1-cgghbjavdyhdbfeb.canadacentral-01.azurewebsites.net/ai-diagnosis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          consultation_category: localFormData.category,
          project_title: localFormData.title,
          project_content: localFormData.background,
          industry: localFormData.industry,
          business_description: localFormData.businessDescription,
          //university: localFormData.university || "",
          university: Array.isArray(formData.university)
            ? formData.university
            : formData.university ? [formData.university] : [],
          research_field: localFormData.researchField || "",
          preferred_researcher_level: Array.isArray(formData.researcherLevel)
            ? formData.researcherLevel
            : formData.researcherLevel ? [formData.researcherLevel] : [],
          application_deadline:
            localFormData.deadline && localFormData.deadline.trim() !== ""
              ? localFormData.deadline
              : "2099-12-31", // ←★ここが重要
          company_user_id: 1, // ←ログイン中の企業ユーザーID（仮で 1 を設定）
        }),
      });

      if (!response.ok) {
        const errText = await response.text(); // ←エラーメッセージの中身も取れるように
        throw new Error("AI診断APIエラー: " + errText);
      }

      const result = await response.json();
      console.log("診断結果", result.message); // ★ここ
      setDiagnosisResult(result || "診断結果が取得できませんでした");
      setShowModal(true);
    } catch (error) {
      console.error("診断エラー:", error);
      setDiagnosisResult("診断中にエラーが発生しました");
      setShowModal(true);
    } finally {
      setLoading(false); // ← しばらくお待ちください。の表示のため
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLocalFormData((prev) => ({ ...prev, [name]: value }));
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(localFormData);
    } else {
      router.push("/register/confirm");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg">

      {/* === 上段ブロック: カテゴリー〜AI課題診断 === */}
      <div className="bg-gray-50 p-6 rounded-lg shadow-md space-y-6 border border-blue-300">
        {/* 依頼のカテゴリー */}
        <div>
          <label className="block text-sm font-medium mb-1">依頼カテゴリー <span className="text-red-500">*</span></label>
          <div className="space-y-2">
            {["ヒアリング", "壁打ち", "共同研究開発"].map((option) => (
              <label key={option} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="category"
                  value={option}
                  onChange={handleChange}
                  checked={localFormData.category === option}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 案件のタイトル */}
        <div>
          <label className="block text-sm font-medium mb-1">案件タイトル（40文字以内） <span className="text-red-500">*</span></label>
          <input
            type="text"
            name="title"
            value={localFormData.title}
            onChange={handleChange}
            maxLength={40}
            placeholder="タイトルを入力してください"
            className="w-full p-2 border border-gray-300 rounded-lg"
          />
        </div>

      {/* 案件内容 */}
      <div>
        <label className="block text-sm font-medium mb-1">案件内容<span className="text-red-500">*</span></label>
        <textarea
          name="background"
          value={localFormData.background}
          onChange={handleChange}
          placeholder="案件内容を記載してください"
          className="w-full p-2 border border-gray-300 rounded-lg"
          rows={4}
        />
      </div>

      {/* 業種 */}
      <div>
        <label className="block text-sm font-medium mb-1">業種</label>
        <select
          name="industry"
          value={localFormData.industry}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-lg"
        >
          <option value="">選択してください</option>
          <option value="自動車">自動車</option>
          <option value="精密機械">精密機械</option>
          <option value="機械">機械</option>
          <option value="化学">化学</option>
          <option value="食品">食品</option>
          <option value="建設">建設</option>
          <option value="サービス">サービス</option>
          <option value="その他">その他</option>
        </select>
      </div>

      {/* 事業内容 */}
      <div className="relative">
        <label className="block text-sm font-medium mb-1">事業内容</label>
        <input
          type="text"
          name="businessDescription"
          value={localFormData.businessDescription}
          onChange={handleChange}
          placeholder="事業内容を入力してください"
          className="w-full p-2 border border-gray-300 rounded-lg"
        />

        {/* 入力欄の外側・右下にボタンを配置 */}
        <div className="flex flex-col items-center mt-6 space-y-2">
          <p className="text-xs text-gray-800 text-center">
            案件登録内容のブラッシュアップにAIアシスト機能をご活用ください。
          </p>
          <button
            type="button"
            onClick={handleDiagnosis}
            className="bg-blue-400 hover:bg-blue-500 text-white text-sm font-semibold py-1 px-3 rounded"
          >
            案件入力AIアシスト
          </button>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full">
              <h2 className="text-xl font-semibold mb-4">AI診断結果</h2>
              <p className="mb-4 whitespace-pre-wrap max-h-[70vh] overflow-y-auto">{diagnosisResult}</p>
              <div className="flex justify-end">
                <button
                  className="px-4 py-2 bg-blue-400 text-white font-semibold rounded hover:bg-blue-500"
                  onClick={() => setShowModal(false)}
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
              <p className="text-lg font-medium mb-4">しばらくお待ちください</p>
              <svg
                className="animate-spin h-10 w-10 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
            </div>
          </div>
        )}

        {validationError && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
              <p className="text-lg font-medium mb-4">{validationError}</p>
              <button
                className="px-4 py-2 bg-blue-400 text-white font-semibold rounded hover:bg-blue-500"
                onClick={() => setValidationError(null)}
              >
                OK
              </button>
            </div>
          </div>
        )}

      </div>
    </div>

      {/* === 下段ブロック: 大学〜確認ボタン === */}
      {/* 大学 */}
      <div>
        <label className="block text-sm font-medium mb-1">大学</label>
        <div className="p-4 rounded-lg border border-gray-300">
          <UniversitySelect
            value={
              Array.isArray(formData.university) &&
              formData.university.length === 1 &&
              formData.university[0] === "全大学"
                ? Object.values(universitiesBySubregion).flat()
                : formData.university || []
            }
            onChange={(value) => {
              const allUniversityNames = Object.values(universitiesBySubregion).flat();
              const isAllSelected = value.length === allUniversityNames.length;
              const updated = isAllSelected ? ["全大学"] : value;

              setFormData({ ...formData, university: updated });
              setLocalFormData((prev) => ({ ...prev, university: updated }));
              setSelectedUniversities(updated);
            }}
          />
        </div>
      </div>

     {/* 研究分野 */}
      <div>
        <label className="block text-sm font-medium mb-1">研究分野</label>
        <select
          name="researchField"
          value={localFormData.researchField}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-lg"
        >
          <option value="">選択してください</option>
          <option value="ライフサイエンス">ライフサイエンス</option>
          <option value="情報通信">情報通信</option>
          <option value="環境・農学">環境・農学</option>
          <option value="ナノテク・材料">ナノテク・材料</option>
          <option value="エネルギー">エネルギー</option>
          <option value="ものづくり技術">ものづくり技術</option>
          <option value="社会基盤">社会基盤</option>
          <option value="フロンティア">フロンティア</option>
          <option value="人文・社会">人文・社会</option>
          <option value="自然科学一般">自然科学一般</option>
          <option value="その他">その他</option>
        </select>
      </div>

      {/* 研究者階層 */}
      <div>
        <label className="block text-sm font-medium mb-1">研究者階層（複数選択可）</label>
        <div className="p-4 rounded-lg border border-gray-300">
          <div className="grid grid-cols-3 gap-x-8">
            {/* 左列：すべて選択 */}
            <div className="flex items-start">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={localFormData.researcherLevel.length === allResearcherLevels.length}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    const updatedLevels = isChecked ? allResearcherLevels : [];
                    setLocalFormData(prev => ({ ...prev, researcherLevel: updatedLevels }));
                    setFormData(prev => ({ ...prev, researcherLevel: updatedLevels }));
                  }}
                />
                <span>すべて選択</span>
              </label>
            </div>

            {/* 右列：研究者階層チェックボックス（縦1列） */}
            <div className="flex flex-col space-y-1">
              {allResearcherLevels.map((level) => (
                <label key={level} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="researcherLevel"
                    value={level}
                    checked={localFormData.researcherLevel.includes(level)}
                    onChange={(e) => {
                      const value = e.target.value;
                      const isChecked = e.target.checked;
                      const updatedLevels = isChecked
                        ? [...localFormData.researcherLevel, value]
                        : localFormData.researcherLevel.filter(item => item !== value);

                      setLocalFormData(prev => ({ ...prev, researcherLevel: updatedLevels }));
                      setFormData(prev => ({ ...prev, researcherLevel: updatedLevels }));
                    }}
                  />
                  <span>{level}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 募集期限 */}
      <div>
        <label className="block text-sm font-medium mb-1">募集期限</label>
        <input
          type="date"
          name="deadline"
          value={localFormData.deadline}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-lg"
        />
      </div>

      {/* ボタン */}
      <div className="flex justify-center">
        <button type="submit" className="bg-gray-400 text-white font-semibold px-6 py-3 rounded-lg hover:bg-gray-500">
          登録内容を確認する
        </button>
      </div>

    </form>
  );
}


