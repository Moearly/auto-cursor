import React, { useState, useEffect } from "react";
import { CursorService } from "../services/cursorService";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { Button } from "../components/Button";
import { useToast, ToastManager } from "../components/Toast";
import { useConfirmDialog } from "../components/ConfirmDialog";
import {
  BackupInfo,
  MachineIds,
  RestoreResult,
  ResetResult,
} from "../types/auth";

type Step =
  | "menu"
  | "select"
  | "preview"
  | "confirm"
  | "result"
  | "reset"
  | "complete_reset"
  | "confirm_reset"
  | "confirm_complete_reset"
  | "custom_path_config";

export const MachineIdPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>("menu");
  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<BackupInfo | null>(null);
  const [selectedIds, setSelectedIds] = useState<MachineIds | null>(null);
  const [currentMachineIds, setCurrentMachineIds] = useState<MachineIds | null>(
    null
  );
  const [machineIdFileContent, setMachineIdFileContent] = useState<
    string | null
  >(null);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(
    null
  );
  const [resetResult, setResetResult] = useState<ResetResult | null>(null);
  const [customCursorPath, setCustomCursorPath] = useState<string>("");
  const [currentCustomPath, setCurrentCustomPath] = useState<string | null>(
    null
  );
  const [isWindows, setIsWindows] = useState<boolean>(false);

  // Toast 和确认对话框
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const { showConfirm, ConfirmDialog } = useConfirmDialog();

  useEffect(() => {
    // 检测操作系统
    const platform = navigator.platform.toLowerCase();
    const isWindowsOS = platform.includes("win");
    setIsWindows(isWindowsOS);

    loadCurrentMachineIds();
    if (isWindowsOS) {
      loadCustomCursorPath();
    }
  }, []);

  const loadCustomCursorPath = async () => {
    try {
      const path = await CursorService.getCustomCursorPath();
      setCurrentCustomPath(path);
      setCustomCursorPath(path || "");
    } catch (error) {
      console.error("加载自定义Cursor路径失败:", error);
    }
  };

  const loadCurrentMachineIds = async () => {
    try {
      setLoading(true);
      const [ids, content] = await Promise.all([
        CursorService.getCurrentMachineIds(),
        CursorService.getMachineIdFileContent(),
      ]);
      setCurrentMachineIds(ids);
      setMachineIdFileContent(content);
    } catch (error) {
      console.error("加载当前 Machine ID 失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadBackups = async () => {
    try {
      setLoading(true);
      const backupList = await CursorService.getBackups();
      setBackups(backupList);
      setCurrentStep("select");
    } catch (error) {
      console.error("加载备份失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackupSelect = async (backup: BackupInfo) => {
    try {
      setLoading(true);
      setSelectedBackup(backup);
      const ids = await CursorService.extractBackupIds(backup.path);
      setSelectedIds(ids);
      setCurrentStep("preview");
    } catch (error) {
      console.error("解析备份内容失败:", error);
      alert("无法从备份中提取机器ID信息");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup) return;

    try {
      setLoading(true);
      setCurrentStep("confirm");
      const result = await CursorService.restoreMachineIds(selectedBackup.path);
      setRestoreResult(result);
      setCurrentStep("result");

      if (result.success) {
        await loadCurrentMachineIds();
      }
    } catch (error) {
      console.error("恢复失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const showResetConfirm = () => {
    setCurrentStep("confirm_reset");
  };

  const showCompleteResetConfirm = () => {
    setCurrentStep("confirm_complete_reset");
  };

  const handleReset = async () => {
    try {
      setLoading(true);
      const result = await CursorService.resetMachineIds();
      setResetResult(result);
      setCurrentStep("reset");

      if (result.success) {
        await loadCurrentMachineIds();
      }
    } catch (error) {
      console.error("重置失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteReset = async () => {
    try {
      setLoading(true);
      const result = await CursorService.completeResetMachineIds();
      setResetResult(result);
      setCurrentStep("complete_reset");

      if (result.success) {
        await loadCurrentMachineIds();
      }
    } catch (error) {
      console.error("完全重置失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBackup = (backup: BackupInfo, event?: React.MouseEvent) => {
    event?.stopPropagation(); // 防止触发选择备份

    showConfirm({
      title: "删除备份",
      message: `确定要删除备份 "${backup.date_formatted}" 吗？此操作无法撤销。`,
      confirmText: "删除",
      cancelText: "取消",
      type: "danger",
      onConfirm: async () => {
        try {
          const result = await CursorService.deleteBackup(backup.path);

          if (result.success) {
            // 重新加载备份列表
            await loadBackups();
            showSuccess("备份删除成功");
          } else {
            showError(`删除失败: ${result.message}`);
          }
        } catch (error) {
          console.error("删除备份失败:", error);
          showError("删除备份时发生错误");
        }
      },
    });
  };

  const handleOpenLogDirectory = async () => {
    try {
      const result = await CursorService.openLogDirectory();
      showSuccess(result);
    } catch (error) {
      console.error("打开日志目录失败:", error);
      showError(`打开日志目录失败: ${error}`);
    }
  };

  const handleGetLogPath = async () => {
    try {
      const logPath = await CursorService.getLogFilePath();
      showSuccess(`日志文件路径: ${logPath}`);
      console.log("日志文件路径:", logPath);
    } catch (error) {
      console.error("获取日志路径失败:", error);
      showError(`获取日志路径失败: ${error}`);
    }
  };

  const handleDebugWindowsPaths = async () => {
    try {
      const debugInfo = await CursorService.debugWindowsCursorPaths();
      console.log("Windows路径调试信息:", debugInfo);

      // 将调试信息显示在控制台和toast中
      const formattedInfo = debugInfo.join("\n\n");
      console.log(`Windows Cursor路径调试信息:\n\n${formattedInfo}`);

      showSuccess("Windows路径调试完成，详细信息已输出到控制台");
    } catch (error) {
      console.error("Windows路径调试失败:", error);
      showError(`Windows路径调试失败: ${error}`);
    }
  };

  const handleSetCustomPath = async () => {
    if (!customCursorPath.trim()) {
      showError("请输入Cursor路径");
      return;
    }

    try {
      const result = await CursorService.setCustomCursorPath(
        customCursorPath.trim()
      );
      console.log("设置自定义路径结果:", result);

      // 重新加载当前路径
      await loadCustomCursorPath();

      showSuccess("自定义Cursor路径设置成功");
      console.log(`路径设置结果:\n\n${result}`);
    } catch (error) {
      console.error("设置自定义路径失败:", error);
      showError(`设置自定义路径失败: ${error}`);
    }
  };

  const handleClearCustomPath = async () => {
    try {
      const result = await CursorService.clearCustomCursorPath();
      console.log("清除自定义路径结果:", result);

      // 重新加载当前路径
      await loadCustomCursorPath();

      showSuccess(result);
    } catch (error) {
      console.error("清除自定义路径失败:", error);
      showError(`清除自定义路径失败: ${error}`);
    }
  };

  const handleFillDetectedPath = async () => {
    try {
      const debugInfo = await CursorService.debugWindowsCursorPaths();

      // 查找第一个有效的路径
      for (const info of debugInfo) {
        if (
          info.includes("- package.json: true") &&
          info.includes("- main.js: true")
        ) {
          const pathMatch = info.match(/路径\d+: (.+)/);
          if (pathMatch) {
            const detectedPath = pathMatch[1].trim();
            setCustomCursorPath(detectedPath);
            showSuccess(`已填充检测到的路径: ${detectedPath}`);
            return;
          }
        }
      }

      showError("未检测到有效的Cursor安装路径");
    } catch (error) {
      console.error("自动填充路径失败:", error);
      showError(`自动填充路径失败: ${error}`);
    }
  };

  if (loading && currentStep === "menu") {
    return <LoadingSpinner message="正在加载 Machine ID 信息..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Machine ID 管理</h1>
        <p className="mt-1 text-sm text-gray-600">
          管理 Cursor 的 Machine ID，包括查看、备份、恢复和重置
        </p>
      </div>

      {/* Current Machine IDs */}
      {currentMachineIds && (
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="mb-4 text-lg font-medium text-gray-900">
            📋 当前 Machine ID
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {Object.entries(currentMachineIds).map(([key, value]) => (
              <div key={key} className="p-3 rounded bg-gray-50">
                <p className="text-sm font-medium text-gray-700">{key}</p>
                <p className="font-mono text-xs text-gray-600 break-all">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {machineIdFileContent && (
            <div className="p-3 mt-4 rounded bg-blue-50">
              <p className="mb-2 text-sm font-medium text-blue-700">
                machineId 文件内容:
              </p>
              <p className="font-mono text-xs text-blue-600 break-all">
                {machineIdFileContent}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {currentStep === "menu" && (
        <div className="space-y-6">
          {/* 主要操作按钮 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Button
              variant="primary"
              onClick={loadBackups}
              loading={loading}
              className="flex-col h-20"
            >
              <span className="mb-1 text-lg">📁</span>
              恢复备份
            </Button>

            <Button
              variant="secondary"
              onClick={showResetConfirm}
              loading={loading}
              className="flex-col h-20"
            >
              <span className="mb-1 text-lg">🔄</span>
              重置 ID
            </Button>

            <Button
              variant="danger"
              onClick={showCompleteResetConfirm}
              loading={loading}
              className="flex-col h-20"
            >
              <span className="mb-1 text-lg">🗑️</span>
              完全重置
            </Button>
          </div>

          {/* 日志管理按钮 */}
          <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="mb-3 text-sm font-medium text-gray-700">
              📝 日志管理
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Button
                variant="secondary"
                onClick={handleGetLogPath}
                className="flex-col h-16 text-sm"
              >
                <span className="mb-1">📍</span>
                获取日志路径
              </Button>

              <Button
                variant="secondary"
                onClick={handleOpenLogDirectory}
                className="flex-col h-16 text-sm"
              >
                <span className="mb-1">📂</span>
                打开日志目录
              </Button>

              {isWindows && (
                <Button
                  variant="secondary"
                  onClick={handleDebugWindowsPaths}
                  className="flex-col h-16 text-sm"
                >
                  <span className="mb-1">🔍</span>
                  调试Win路径
                </Button>
              )}
            </div>
          </div>

          {/* 自定义路径配置按钮 - 仅Windows显示 */}
          {isWindows && (
            <div className="p-4 bg-white rounded-lg shadow">
              <h3 className="mb-3 text-sm font-medium text-gray-700">
                ⚙️ 路径配置
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-1">
                <Button
                  variant="secondary"
                  onClick={() => setCurrentStep("custom_path_config")}
                  className="flex-col h-16 text-sm"
                >
                  <span className="mb-1">📁</span>
                  自定义Cursor路径
                </Button>
                {currentCustomPath && (
                  <div className="p-2 mt-2 text-xs bg-gray-100 rounded">
                    <span className="font-medium">当前自定义路径:</span>
                    <br />
                    <span className="text-gray-600">{currentCustomPath}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 自定义路径配置页面 */}
      {currentStep === "custom_path_config" && (
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">自定义 Cursor 路径配置</h2>
            <Button
              variant="secondary"
              onClick={() => setCurrentStep("menu")}
              className="text-sm"
            >
              ← 返回主菜单
            </Button>
          </div>

          <div className="space-y-6">
            {/* 说明文字 */}
            <div className="p-4 rounded-lg bg-blue-50">
              <h3 className="mb-2 font-medium text-blue-800">
                🔍 路径配置说明
              </h3>
              <p className="text-sm text-blue-700">
                如果自动检测无法找到 Cursor 安装路径，你可以手动指定。
                <br />
                路径应该指向 Cursor 的{" "}
                <code className="px-1 bg-blue-100 rounded">
                  resources/app
                </code>{" "}
                目录。
                <br />
                例如:{" "}
                <code className="px-1 bg-blue-100 rounded">
                  C:\Users\用户名\AppData\Local\Programs\Cursor\resources\app
                </code>
              </p>
            </div>

            {/* 当前状态 */}
            <div className="p-4 rounded-lg bg-gray-50">
              <h3 className="mb-2 font-medium text-gray-800">📍 当前状态</h3>
              <div className="text-sm text-gray-600">
                {currentCustomPath ? (
                  <div>
                    <span className="font-medium">已设置自定义路径:</span>
                    <br />
                    <span className="px-1 font-mono text-xs bg-gray-200 rounded">
                      {currentCustomPath}
                    </span>
                  </div>
                ) : (
                  <span>未设置自定义路径，使用自动检测</span>
                )}
              </div>
            </div>

            {/* 路径输入 */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-800">📝 设置自定义路径</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={customCursorPath}
                  onChange={(e) => setCustomCursorPath(e.target.value)}
                  placeholder="请输入 Cursor 的 resources/app 目录完整路径"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    onClick={handleSetCustomPath}
                    className="text-sm"
                  >
                    💾 保存路径
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={handleFillDetectedPath}
                    className="text-sm"
                  >
                    🔍 自动检测并填充
                  </Button>

                  <Button
                    variant="danger"
                    onClick={handleClearCustomPath}
                    className="text-sm"
                  >
                    🗑️ 清除自定义路径
                  </Button>
                </div>
              </div>
            </div>

            {/* 调试工具 */}
            <div className="p-4 rounded-lg bg-yellow-50">
              <h3 className="mb-2 font-medium text-yellow-800">🛠️ 调试工具</h3>
              <p className="mb-3 text-sm text-yellow-700">
                如果不确定正确的路径，可以使用调试工具查看所有可能的安装位置。
              </p>
              <Button
                variant="secondary"
                onClick={handleDebugWindowsPaths}
                className="text-sm"
              >
                🔍 查看所有可能路径
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Selection */}
      {currentStep === "select" && (
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">选择备份</h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentStep("menu")}
            >
              返回
            </Button>
          </div>

          {backups.length === 0 ? (
            <p className="py-8 text-center text-gray-500">没有找到备份文件</p>
          ) : (
            <div className="space-y-3">
              {backups.map((backup, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                  onClick={() => handleBackupSelect(backup)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {backup.date_formatted}
                      </p>
                      <p className="text-sm text-gray-600">
                        大小: {backup.size} bytes
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={(e) => handleDeleteBackup(backup, e)}
                        className="text-xs"
                      >
                        🗑️ 删除
                      </Button>
                      <span className="text-blue-600">→</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview Step */}
      {currentStep === "preview" && selectedBackup && selectedIds && (
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">预览备份内容</h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentStep("select")}
            >
              返回
            </Button>
          </div>

          <div className="mb-6 space-y-4">
            <div className="p-4 rounded-lg bg-blue-50">
              <h3 className="mb-2 font-medium text-blue-800">备份信息</h3>
              <p className="text-sm text-blue-700">
                日期: {selectedBackup.date_formatted}
              </p>
              <p className="text-sm text-blue-700">
                大小: {selectedBackup.size} bytes
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-gray-800">
                将要恢复的 Machine ID:
              </h3>
              {Object.entries(selectedIds).map(([key, value]) => (
                <div key={key} className="p-3 rounded bg-gray-50">
                  <p className="text-sm font-medium text-gray-700">{key}</p>
                  <p className="font-mono text-xs text-gray-600 break-all">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="primary" onClick={handleRestore} loading={loading}>
              确认恢复
            </Button>
            <Button
              variant="secondary"
              onClick={() => setCurrentStep("select")}
            >
              取消
            </Button>
          </div>
        </div>
      )}

      {/* Confirm Step */}
      {currentStep === "confirm" && (
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="text-center">
            <div className="mb-4 text-4xl">⏳</div>
            <h2 className="mb-2 text-lg font-medium text-gray-900">
              正在恢复...
            </h2>
            <p className="text-gray-600">请稍候，正在恢复 Machine ID</p>
          </div>
        </div>
      )}

      {/* Result Step */}
      {currentStep === "result" && restoreResult && (
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="mb-6 text-center">
            <div
              className={`text-4xl mb-4 ${
                restoreResult.success ? "text-green-500" : "text-red-500"
              }`}
            >
              {restoreResult.success ? "✅" : "❌"}
            </div>
            <h2 className="mb-2 text-lg font-medium text-gray-900">
              {restoreResult.success ? "恢复成功" : "恢复失败"}
            </h2>
            <p className="text-gray-600">{restoreResult.message}</p>
          </div>

          {restoreResult.details && restoreResult.details.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-2 font-medium text-gray-700">详细信息:</h3>
              <div className="space-y-1">
                {restoreResult.details.map((detail, index) => (
                  <p
                    key={index}
                    className="p-2 text-sm text-gray-600 rounded bg-gray-50"
                  >
                    {detail}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center gap-3">
            <Button
              variant="primary"
              onClick={() => {
                setCurrentStep("menu");
                setRestoreResult(null);
                setSelectedBackup(null);
                setSelectedIds(null);
              }}
            >
              返回主菜单
            </Button>
            <Button variant="secondary" onClick={loadCurrentMachineIds}>
              刷新当前 ID
            </Button>
          </div>
        </div>
      )}

      {/* Reset Result */}
      {(currentStep === "reset" || currentStep === "complete_reset") &&
        resetResult && (
          <div className="p-6 bg-white rounded-lg shadow">
            <div className="mb-6 text-center">
              <div
                className={`text-4xl mb-4 ${
                  resetResult.success ? "text-green-500" : "text-red-500"
                }`}
              >
                {resetResult.success ? "✅" : "❌"}
              </div>
              <h2 className="mb-2 text-lg font-medium text-gray-900">
                {currentStep === "complete_reset" ? "完全重置" : "重置"}
                {resetResult.success ? "成功" : "失败"}
              </h2>
              <p className="text-gray-600">{resetResult.message}</p>
            </div>

            {resetResult.new_ids && (
              <div className="mb-6">
                <h3 className="mb-2 font-medium text-gray-700">
                  新的 Machine ID:
                </h3>
                <div className="space-y-2">
                  {Object.entries(resetResult.new_ids).map(([key, value]) => (
                    <div key={key} className="p-3 rounded bg-green-50">
                      <p className="text-sm font-medium text-green-700">
                        {key}
                      </p>
                      <p className="font-mono text-xs text-green-600 break-all">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resetResult.details && resetResult.details.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-2 font-medium text-gray-700">详细信息:</h3>
                <div className="space-y-1">
                  {resetResult.details.map((detail, index) => (
                    <p
                      key={index}
                      className="p-2 text-sm text-gray-600 rounded bg-gray-50"
                    >
                      {detail}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center gap-3">
              <Button
                variant="primary"
                onClick={() => {
                  setCurrentStep("menu");
                  setResetResult(null);
                }}
              >
                返回主菜单
              </Button>
              <Button variant="secondary" onClick={loadCurrentMachineIds}>
                刷新当前 ID
              </Button>
            </div>
          </div>
        )}

      {/* Reset Confirmation */}
      {currentStep === "confirm_reset" && (
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="mb-6 text-center">
            <div className="mb-4 text-4xl">⚠️</div>
            <h2 className="mb-2 text-lg font-medium text-gray-900">
              确认重置 Machine ID
            </h2>
            <p className="mb-4 text-gray-600">
              此操作将重置所有 Machine ID 为新的随机值。这可能会影响 Cursor
              的授权状态。
            </p>
            <div className="p-4 mb-4 border border-yellow-200 rounded-md bg-yellow-50">
              <p className="text-sm text-yellow-800">
                <strong>注意：</strong>重置后您可能需要重新登录 Cursor 账户。
              </p>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Button variant="danger" onClick={handleReset} loading={loading}>
              确认重置
            </Button>
            <Button variant="secondary" onClick={() => setCurrentStep("menu")}>
              取消
            </Button>
          </div>
        </div>
      )}

      {/* Complete Reset Confirmation */}
      {currentStep === "confirm_complete_reset" && (
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="mb-6 text-center">
            <div className="mb-4 text-4xl">🚨</div>
            <h2 className="mb-2 text-lg font-medium text-gray-900">
              确认完全重置
            </h2>
            <p className="mb-4 text-gray-600">
              此操作将完全清除 Cursor 的所有配置和数据，包括 Machine
              ID，以及注入脚本等。
            </p>
            <div className="p-4 mb-4 border border-red-200 rounded-md bg-red-50">
              <p className="text-sm text-red-800">
                <strong>危险操作：</strong>这将删除所有 Cursor
                相关数据，无法撤销！
              </p>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                <li>所有用户设置将被清除</li>
                <li>已安装的扩展将被移除</li>
                <li>需要重新配置 Cursor</li>
                <li>需要重新登录账户</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Button
              variant="danger"
              onClick={handleCompleteReset}
              loading={loading}
            >
              确认完全重置
            </Button>
            <Button variant="secondary" onClick={() => setCurrentStep("menu")}>
              取消
            </Button>
          </div>
        </div>
      )}

      {/* Toast 管理器 */}
      <ToastManager toasts={toasts} removeToast={removeToast} />

      {/* 确认对话框 */}
      <ConfirmDialog />
    </div>
  );
};
