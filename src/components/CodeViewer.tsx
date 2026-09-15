import React, { useState } from 'react';
import {
  Folder, FileCode, Copy, Check, Download, Archive, Server,
  ExternalLink, Layers, Terminal, Sparkles
} from 'lucide-react';
import JSZip from 'jszip';
import { BACKEND_FILES, BACKEND_PROJECT_STRUCTURE } from '../data/backendCode';
import { BackendFile } from '../types/sniper';

export function CodeViewer() {
  const [selectedFile, setSelectedFile] = useState<BackendFile>(BACKEND_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedFile.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const rootFolder = zip.folder('ktx-sniper-backend');
      if (rootFolder) {
        BACKEND_FILES.forEach((file) => {
          rootFolder.file(file.path, file.content);
        });

        // Add README.md
        rootFolder.file(
          'README.md',
          `# KTX 취소표 자동 선점 시스템 (Phase 1 백엔드)

## 1. 실행 방법 (로컬)
\`\`\`bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
\`\`\`

## 2. Docker 구동
\`\`\`bash
docker compose up -d --build
\`\`\`

## 3. Ubuntu 서버 배포
\`\`\`bash
chmod +x deploy.sh
./deploy.sh
\`\`\`
`
        );

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'ktx-sniper-backend.zip';
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('ZIP 생성 실패', e);
    } finally {
      setIsZipping(false);
    }
  };

  const getCategoryBadge = (category: BackendFile['category']) => {
    switch (category) {
      case 'core':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">Core</span>;
      case 'api':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">API</span>;
      case 'service':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">Worker</span>;
      case 'deploy':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-medium">Deploy</span>;
      case 'config':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">Config</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-md bg-blue-600 text-white text-xs font-bold">Phase 1 완료</span>
            <h1 className="text-xl font-bold text-slate-900">FastAPI 백엔드 전체 아키텍처 & 소스코드</h1>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            korail2 기반 자동 세션 갱신, 차단 방지 가변 Jitter 슬립, 즉시 선점 트랜잭션 및 텔레그램 알림 파이프라인이 모두 포함된 프로덕션용 코드입니다.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-download-zip"
            type="button"
            onClick={handleDownloadAllZip}
            disabled={isZipping}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-2 shadow-sm transition-all active:scale-[0.98]"
          >
            <Archive className="w-4 h-4" />
            <span>{isZipping ? '압축 중...' : '전체 프로젝트 ZIP 다운로드'}</span>
          </button>
        </div>
      </div>

      {/* Code Browser Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: File Explorer (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center space-x-2">
                <Folder className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-sm text-slate-900">프로젝트 디렉토리 구조</span>
              </div>
              <span className="text-xs text-slate-500 font-mono">{BACKEND_FILES.length}개 파일</span>
            </div>

            <div className="space-y-1">
              {BACKEND_FILES.map((file) => (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-mono flex items-center justify-between transition-colors ${
                    selectedFile.path === file.path
                      ? 'bg-blue-50 text-blue-800 font-bold border border-blue-200/80 shadow-xs'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <FileCode className={`w-3.5 h-3.5 shrink-0 ${selectedFile.path === file.path ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="truncate">{file.path}</span>
                  </div>
                  <div className="shrink-0 pl-2">
                    {getCategoryBadge(file.category)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Directory Tree Card */}
          <div className="bg-slate-900 text-slate-300 rounded-2xl p-4 font-mono text-xs border border-slate-800 shadow-sm">
            <span className="text-slate-500 font-semibold block mb-2 uppercase text-[10px] tracking-wider">
              Tree Layout
            </span>
            <pre className="overflow-x-auto text-[11px] leading-relaxed text-slate-400">
              {BACKEND_PROJECT_STRUCTURE.trim()}
            </pre>
          </div>
        </div>

        {/* Right Column: Code Editor/Viewer (8 cols) */}
        <div className="lg:col-span-8">
          <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[700px]">
            {/* Code Header */}
            <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileCode className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-white">{selectedFile.path}</span>
                    {getCategoryBadge(selectedFile.category)}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{selectedFile.description}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  id="btn-copy-code"
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1.5 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">복사 완료</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>코드 복사</span>
                    </>
                  )}
                </button>

                <button
                  id="btn-download-file"
                  type="button"
                  onClick={handleDownloadFile}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  title="이 파일 단독 다운로드"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-slate-200 leading-relaxed selection:bg-blue-800 selection:text-white">
              <pre className="overflow-x-auto whitespace-pre">
                <code>{selectedFile.content}</code>
              </pre>
            </div>

            {/* Code Footer */}
            <div className="bg-slate-900 px-4 py-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>{selectedFile.language.toUpperCase()} &middot; {selectedFile.content.split('\n').length} lines</span>
              <span>Encoding: UTF-8 &middot; PEP-8 Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
