import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Globe,
  Terminal,
  Maximize2,
  Minimize2,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Sword,
  Flame,
  Zap,
  X,
  FolderArchive,
  Cloud,
  UploadCloud,
  FileArchive,
  ShieldCheck,
  Coins,
  Heart,
  Skull,
  BookOpen,
} from 'lucide-react';

export default function App() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGmModal, setShowGmModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCfLink, setCopiedCfLink] = useState(false);
  const [gmCommandInput, setGmCommandInput] = useState('');
  const [gmLogs, setGmLogs] = useState<string[]>([
    'Chào mừng tới Võ Lâm Truyền Kỳ Offline!',
    'Bạn có thể dùng các nút GM bên dưới hoặc nhấn phím 5 trong game để mở Lệnh Bài Admin.',
  ]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadSizeText, setDownloadSizeText] = useState('');
  const [activeShareTab, setActiveShareTab] = useState<'cloudflare' | 'netlify' | 'github' | 'vercel' | 'direct'>('cloudflare');

  const externalBackupLinks = {
    cloudflareZip: 'https://gofile.io/d/an0vIBNS',
    offlineFullZip: 'https://gofile.io/d/Md4yAH2H',
  };

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  const getZipDownloadUrl = (filename = 'VoLam_Offline_ChoiDon.zip') => {
    return typeof window !== 'undefined'
      ? `${window.location.origin}/${filename}`
      : `/${filename}`;
  };

  const getCloudflareZipUrl = () => getZipDownloadUrl('volam_cloudflare_pages.zip');

  const getDirectPlayUrl = () => {
    return typeof window !== 'undefined'
      ? `${window.location.origin}/game/index.html`
      : '/game/index.html';
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      gameContainerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);

    // Listen to GM results from inside iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GM_RESULT') {
        const text = `> [Kết quả]: ${event.data.result}`;
        setGmLogs((prev) => [text, ...prev.slice(0, 19)]);
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleReloadGame = () => {
    if (iframeRef.current) {
      iframeRef.current.src = `/game/index.html?t=${Date.now()}`;
      setGmLogs((prev) => ['> Đã làm mới game.', ...prev.slice(0, 19)]);
    }
  };

  // Send GM Command to Game Canvas
  const sendGmCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    try {
      const win = iframeRef.current?.contentWindow as any;
      let handled = false;

      // Method 1: direct call to window.execGmCommand inside game
      if (win && typeof win.execGmCommand === 'function') {
        const res = win.execGmCommand(trimmed);
        const reply = typeof res === 'string' ? res : 'Đã thực thi thành công';
        setGmLogs((prev) => [`> ${trimmed}: ${reply}`, ...prev.slice(0, 19)]);
        handled = true;
      }
      
      // Method 2: direct call to admUse() if command is open admin
      if (!handled && (trimmed === 'menu' || trimmed === 'adm' || trimmed === '/adm')) {
        if (win && typeof win.admUse === 'function') {
          win.admUse();
          setGmLogs((prev) => [`> Đã mở menu Lệnh bài Admin (phím 5)`, ...prev.slice(0, 19)]);
          handled = true;
        }
      }

      // Method 3: postMessage to iframe
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'GM_COMMAND', command: trimmed },
          '*'
        );
        if (!handled) {
          setGmLogs((prev) => [`> Đã gửi lệnh "${trimmed}" tới game`, ...prev.slice(0, 19)]);
        }
      }
    } catch (err: any) {
      setGmLogs((prev) => [
        `> Lỗi: ${err?.message || 'Không thể gửi lệnh'}`,
        ...prev.slice(0, 19),
      ]);
    }
    setGmCommandInput('');
  };

  // Safe In-Browser Stream Downloader (Prevents 10KB Cloud Run login page issue)
  const handleDownloadZipStream = async (fileName = 'volam_cloudflare_pages.zip') => {
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadSizeText('Đang chuẩn bị tải dữ liệu...');

    // Option A: Modern File System Access API
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: 'ZIP File',
              accept: { 'application/zip': ['.zip'] },
            },
          ],
        });

        setDownloadSizeText('Đang truyền dữ liệu stream...');
        const writableStream = await fileHandle.createWritable();

        const response = await fetch(`/${fileName}`, { credentials: 'same-origin' });
        if (!response.ok) throw new Error(`Lỗi máy chủ: ${response.status}`);

        const contentLengthHeader = response.headers.get('content-length');
        const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 49222811;

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Không thể đọc stream');

        let receivedBytes = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            await writableStream.write(value);
            receivedBytes += value.length;
            const pct = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
            setDownloadProgress(pct);
            setDownloadSizeText(
              `${(receivedBytes / 1048576).toFixed(1)} MB / ${(totalBytes / 1048576).toFixed(1)} MB (${pct}%)`
            );
          }
        }

        await writableStream.close();
        setDownloadSizeText('Đã lưu file thành công 100%!');
        setIsDownloading(false);
        setTimeout(() => setDownloadProgress(null), 3000);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          setIsDownloading(false);
          setDownloadProgress(null);
          return;
        }
        console.warn('showSaveFilePicker error, fallback to memory buffer:', err);
      }
    }

    // Option B: Memory chunked download with blob
    try {
      setDownloadSizeText('Đang tải stream về bộ nhớ...');
      const response = await fetch(`/${fileName}`, { credentials: 'same-origin' });
      if (!response.ok) throw new Error(`Lỗi HTTP ${response.status}`);

      const contentLengthHeader = response.headers.get('content-length');
      const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 49222811;

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Reader không khả dụng');

      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          receivedBytes += value.length;
          const pct = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
          setDownloadProgress(pct);
          setDownloadSizeText(
            `${(receivedBytes / 1048576).toFixed(1)} MB / ${(totalBytes / 1048576).toFixed(1)} MB (${pct}%)`
          );
        }
      }

      setDownloadSizeText('Đang tạo tệp nén...');
      const blob = new Blob(chunks as any[], { type: 'application/zip' });
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);

      setDownloadSizeText('Tải hoàn tất! Kiểm tra thư mục Downloads của bạn.');
      setIsDownloading(false);
      setTimeout(() => setDownloadProgress(null), 4000);
    } catch (err: any) {
      console.error('Download stream failed:', err);
      setIsDownloading(false);
      setDownloadProgress(null);
      // Fallback redirect
      window.open(externalBackupLinks.cloudflareZip, '_blank');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-stone-950 text-stone-200 select-none overflow-hidden font-serif">
      {/* HEADER BAR */}
      <header className="h-14 bg-stone-900/95 border-b border-amber-900/50 flex items-center justify-between px-3 sm:px-5 shrink-0 z-20 shadow-lg">
        {/* Title & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-900 border border-amber-500/40 flex items-center justify-center shadow-md">
            <Sword className="w-5 h-5 text-amber-200" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-amber-300 tracking-wide flex items-center gap-1.5 font-sans">
              <span>Võ Lâm Truyền Kỳ H5</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-700/60 font-mono font-normal">
                Bản Offline
              </span>
            </h1>
            <p className="text-[11px] text-stone-400 hidden sm:block">
              10 Môn Phái · Đồ Hoàng Kim · Bất Tử · Lệnh GM (Phím 5)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Cloudflare Pages 1-File Button */}
          <button
            onClick={() => {
              setActiveShareTab('cloudflare');
              setShowShareModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold transition shadow-md shadow-orange-950/50 active:scale-95 border border-amber-400/30"
            title="Tải 1 file kéo thả lên dash.cloudflare.com để lấy link online"
          >
            <Cloud className="w-4 h-4 text-amber-200 animate-pulse" />
            <span className="hidden sm:inline">1 File Lên Cloudflare Pages</span>
            <span className="sm:hidden font-mono text-[11px]">Cloudflare</span>
          </button>

          {/* GM Tools Button */}
          <button
            onClick={() => setShowGmModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-700 to-yellow-600 hover:from-amber-600 hover:to-yellow-500 text-white text-xs font-bold transition shadow-md shadow-amber-950/50 active:scale-95 border border-amber-400/40"
            title="Bảng điều khiển lệnh GM & Hack"
          >
            <Terminal className="w-3.5 h-3.5 text-yellow-200" />
            <span>Lệnh GM</span>
          </button>

          {/* Download Full Zip Button */}
          <button
            onClick={() => setShowDownloadModal(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition border border-stone-700 active:scale-95"
            title="Tải trọn bộ game chơi offline không cần mạng"
          >
            <Download className="w-3.5 h-3.5 text-stone-300" />
            <span className="hidden md:inline">Tải Về Máy</span>
          </button>

          {/* Share Online Button */}
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition border border-stone-700 active:scale-95"
            title="Cách tạo link online miễn phí gửi bạn bè"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Chia Sẻ Online</span>
          </button>

          {/* Reload Game */}
          <button
            onClick={handleReloadGame}
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition border border-stone-700 active:scale-95"
            title="Làm mới game"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition border border-stone-700 active:scale-95"
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* QUICK GM BAR */}
      <div className="bg-stone-900 border-b border-stone-800 px-3 py-1 flex items-center justify-between text-xs overflow-x-auto gap-2 shrink-0">
        <div className="flex items-center gap-1.5 text-stone-300 font-mono text-[11px] shrink-0">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-amber-400 font-bold">GM Nhanh:</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto py-0.5">
          <button
            onClick={() => sendGmCommand('menu')}
            className="px-2 py-0.5 rounded bg-amber-900/60 hover:bg-amber-800 text-amber-200 font-semibold border border-amber-600/50 transition active:scale-95 text-[11px]"
            title="Mở Lệnh Bài Admin trong game (Phím 5)"
          >
            ⭐ Menu Admin (Phím 5)
          </button>
          <button
            onClick={() => sendGmCommand('/god')}
            className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-emerald-300 border border-stone-700 transition active:scale-95 text-[11px]"
            title="Bật/Tắt Bất Tử"
          >
            🛡️ Bất Tử
          </button>
          <button
            onClick={() => sendGmCommand('/ohk')}
            className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-red-300 border border-stone-700 transition active:scale-95 text-[11px]"
            title="Nhất Kích Tất Sát (Đánh 1 hit)"
          >
            ⚔️ Nhất Kích
          </button>
          <button
            onClick={() => sendGmCommand('/exp')}
            className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-yellow-300 border border-stone-700 transition active:scale-95 text-[11px]"
            title="Lên Cấp Tối Đa"
          >
            🚀 Max Cấp (200)
          </button>
          <button
            onClick={() => sendGmCommand('/gold')}
            className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 transition active:scale-95 text-[11px]"
            title="+100 Triệu Ngân Lượng"
          >
            💰 +100M Vàng
          </button>
          <button
            onClick={() => sendGmCommand('/knb')}
            className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-cyan-300 border border-stone-700 transition active:scale-95 text-[11px]"
            title="+100,000 Kim Nguyên Bảo"
          >
            💎 +100K KNB
          </button>
          <button
            onClick={() => sendGmCommand('/eq')}
            className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-purple-300 border border-stone-700 transition active:scale-95 text-[11px]"
            title="Trang Bị Hoàng Kim Môn Phái"
          >
            👑 Full Đồ HK
          </button>
          <button
            onClick={() => sendGmCommand('/skill')}
            className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-blue-300 border border-stone-700 transition active:scale-95 text-[11px]"
            title="Max Kỹ Năng Môn Phái"
          >
            📜 Max Kỹ Năng
          </button>
          <button
            onClick={() => sendGmCommand('/all')}
            className="px-2.5 py-0.5 rounded bg-gradient-to-r from-red-700 to-amber-700 hover:from-red-600 hover:to-amber-600 text-white font-bold border border-amber-500/50 transition active:scale-95 text-[11px]"
            title="Kích hoạt tất cả cheat cùng lúc!"
          >
            🔥 HACK TẤT CẢ (VIP)
          </button>
        </div>
      </div>

      {/* GAME CANVAS IFRAME */}
      <main ref={gameContainerRef} className="flex-1 w-full h-full relative bg-black overflow-hidden flex items-center justify-center">
        <iframe
          ref={iframeRef}
          src="/game/index.html"
          title="Võ Lâm Truyền Kỳ H5"
          className="w-full h-full border-0 select-none bg-black"
          allow="autoplay; fullscreen"
        />
      </main>

      {/* MODAL 1: GM CONTROL PANEL */}
      {showGmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-stone-900 border border-amber-600/60 rounded-xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 border-b border-amber-700/40 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-base font-sans">
                <Terminal className="w-5 h-5 text-amber-400" />
                <span>BẢNG ĐIỀU KHIỂN LỆNH GM & HACK GAME</span>
              </div>
              <button
                onClick={() => setShowGmModal(false)}
                className="p-1 rounded hover:bg-stone-700 text-stone-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs text-stone-300 leading-relaxed font-sans">
              {/* Highlight Announcement */}
              <div className="bg-amber-950/40 border border-amber-600/40 rounded-lg p-3.5 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-300 text-sm">
                    Lệnh Bài Admin Có Sẵn Trong Game (Phím số 5)
                  </h4>
                  <p className="text-stone-300 text-xs mt-1">
                    Công cụ GM đã được kích hoạt trực tiếp vào thanh kỹ năng nhanh (ô số 5). Bạn có thể bấm nút lớn bên dưới hoặc nhấn phím <b>5</b> trên bàn phím lúc đang chơi để mở giao diện Admin đầy đủ (chỉnh cấp, tiền, trang bị, bí kíp, bãi quái).
                  </p>
                </div>
              </div>

              {/* Big Direct Admin Button */}
              <button
                onClick={() => {
                  sendGmCommand('menu');
                  setShowGmModal(false);
                }}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-600 hover:from-amber-500 hover:to-yellow-500 text-black font-extrabold text-sm tracking-wide shadow-lg border border-amber-300/40 flex items-center justify-center gap-2 transition active:scale-98"
              >
                <Zap className="w-5 h-5 fill-current" />
                <span>MỞ BẢNG LỆNH BÀI ADMIN TRONG GAME (PHÍM 5)</span>
              </button>

              {/* Quick GM Shortcuts Grid */}
              <div className="space-y-2">
                <h4 className="text-amber-300 font-bold text-xs flex items-center gap-1.5 uppercase">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>Các Phím Tắt Lệnh GM Cực Nhanh:</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => sendGmCommand('/god')}
                    className="p-2.5 rounded bg-stone-800 hover:bg-emerald-950/60 hover:text-emerald-300 border border-stone-700 hover:border-emerald-500/50 text-left transition"
                  >
                    <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                      <ShieldCheck className="w-4 h-4" /> Bất Tử (God)
                    </div>
                    <div className="text-[10px] text-stone-400">Không bao giờ mất máu</div>
                  </button>

                  <button
                    onClick={() => sendGmCommand('/ohk')}
                    className="p-2.5 rounded bg-stone-800 hover:bg-red-950/60 hover:text-red-300 border border-stone-700 hover:border-red-500/50 text-left transition"
                  >
                    <div className="font-bold flex items-center gap-1.5 text-red-400">
                      <Skull className="w-4 h-4" /> Nhất Kích Tất Sát
                    </div>
                    <div className="text-[10px] text-stone-400">1 chiêu diệt mọi Boss</div>
                  </button>

                  <button
                    onClick={() => sendGmCommand('/exp')}
                    className="p-2.5 rounded bg-stone-800 hover:bg-amber-950/60 hover:text-amber-300 border border-stone-700 hover:border-amber-500/50 text-left transition"
                  >
                    <div className="font-bold flex items-center gap-1.5 text-amber-400">
                      <Sparkles className="w-4 h-4" /> Cấp Tối Đa (200)
                    </div>
                    <div className="text-[10px] text-stone-400">Đạt max cấp ngay lập tức</div>
                  </button>

                  <button
                    onClick={() => sendGmCommand('/gold')}
                    className="p-2.5 rounded bg-stone-800 hover:bg-yellow-950/60 hover:text-yellow-300 border border-stone-700 hover:border-yellow-500/50 text-left transition"
                  >
                    <div className="font-bold flex items-center gap-1.5 text-yellow-400">
                      <Coins className="w-4 h-4" /> +100M Ngân Lượng
                    </div>
                    <div className="text-[10px] text-stone-400">Thoải mái mua sắm</div>
                  </button>

                  <button
                    onClick={() => sendGmCommand('/knb')}
                    className="p-2.5 rounded bg-stone-800 hover:bg-cyan-950/60 hover:text-cyan-300 border border-stone-700 hover:border-cyan-500/50 text-left transition"
                  >
                    <div className="font-bold flex items-center gap-1.5 text-cyan-400">
                      <Sparkles className="w-4 h-4" /> +100,000 KNB
                    </div>
                    <div className="text-[10px] text-stone-400">Kỳ Trân Các vô hạn</div>
                  </button>

                  <button
                    onClick={() => sendGmCommand('/skill')}
                    className="p-2.5 rounded bg-stone-800 hover:bg-blue-950/60 hover:text-blue-300 border border-stone-700 hover:border-blue-500/50 text-left transition"
                  >
                    <div className="font-bold flex items-center gap-1.5 text-blue-400">
                      <BookOpen className="w-4 h-4" /> Max Kỹ Năng
                    </div>
                    <div className="text-[10px] text-stone-400">Học full chiêu thức môn phái</div>
                  </button>

                  <button
                    onClick={() => sendGmCommand('/eq')}
                    className="p-2.5 rounded bg-stone-800 hover:bg-purple-950/60 hover:text-purple-300 border border-stone-700 hover:border-purple-500/50 text-left transition"
                  >
                    <div className="font-bold flex items-center gap-1.5 text-purple-400">
                      <Sword className="w-4 h-4" /> Full Đồ Hoàng Kim
                    </div>
                    <div className="text-[10px] text-stone-400">Set trang bị môn phái VIP</div>
                  </button>

                  <button
                    onClick={() => sendGmCommand('/horse')}
                    className="p-2.5 rounded bg-stone-800 hover:bg-amber-950/60 hover:text-amber-300 border border-stone-700 hover:border-amber-500/50 text-left transition"
                  >
                    <div className="font-bold flex items-center gap-1.5 text-amber-300">
                      🐎 Thần Mã Hoàng Kim
                    </div>
                    <div className="text-[10px] text-stone-400">Bôn Tiêu, Phi Vân, Chiếu Dạ</div>
                  </button>

                  <button
                    onClick={() => sendGmCommand('/unlock')}
                    className="p-2.5 rounded bg-stone-800 hover:bg-emerald-950/60 hover:text-emerald-300 border border-stone-700 hover:border-emerald-500/50 text-left transition"
                  >
                    <div className="font-bold flex items-center gap-1.5 text-emerald-300">
                      🗺️ Mở Full Bản Đồ
                    </div>
                    <div className="text-[10px] text-stone-400">Mở toàn bộ bãi luyện cấp</div>
                  </button>

                  <button
                    onClick={() => sendGmCommand('/full')}
                    className="p-2.5 rounded bg-stone-800 hover:bg-rose-950/60 hover:text-rose-300 border border-stone-700 hover:border-rose-500/50 text-left transition"
                  >
                    <div className="font-bold flex items-center gap-1.5 text-rose-300">
                      <Heart className="w-4 h-4" /> Hồi Đầy Máu/Mana
                    </div>
                    <div className="text-[10px] text-stone-400">Hồi 100% Sinh & Nội lực</div>
                  </button>

                  <button
                    onClick={() => sendGmCommand('/cd')}
                    className="p-2.5 rounded bg-stone-800 hover:bg-cyan-950/60 hover:text-cyan-300 border border-stone-700 hover:border-cyan-500/50 text-left transition"
                  >
                    <div className="font-bold flex items-center gap-1.5 text-cyan-300">
                      ⚡ Xóa Hồi Chiêu
                    </div>
                    <div className="text-[10px] text-stone-400">Xả chiêu liên tục không chờ</div>
                  </button>

                  <button
                    onClick={() => sendGmCommand('/all')}
                    className="p-2.5 rounded bg-gradient-to-r from-red-900/80 to-amber-900/80 hover:from-red-800 hover:to-amber-800 border border-amber-500/60 text-left transition col-span-2 sm:col-span-1"
                  >
                    <div className="font-bold flex items-center gap-1.5 text-amber-200">
                      🔥 KÍCH HOẠT TẤT CẢ
                    </div>
                    <div className="text-[10px] text-amber-300/80">Nhận trọn bộ siêu VIP</div>
                  </button>
                </div>
              </div>

              {/* Command Input Bar */}
              <div className="space-y-1.5 pt-2 border-t border-stone-800">
                <label className="text-amber-300 font-bold block text-xs">
                  Nhập Lệnh Trực Tiếp (Console Command):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={gmCommandInput}
                    onChange={(e) => setGmCommandInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendGmCommand(gmCommandInput)}
                    placeholder="Ví dụ: /exp, /god, /gold, /knb, /skill, /horse..."
                    className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-amber-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={() => sendGmCommand(gmCommandInput)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg text-xs transition"
                  >
                    Gửi Lệnh
                  </button>
                </div>
              </div>

              {/* Command Log */}
              <div className="space-y-1">
                <span className="text-stone-400 text-[11px]">Nhật ký lệnh GM:</span>
                <div className="bg-stone-950 border border-stone-800 rounded-lg p-2.5 h-28 overflow-y-auto font-mono text-[11px] text-stone-300 space-y-0.5">
                  {gmLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className={
                        log.includes('Lỗi')
                          ? 'text-red-400'
                          : log.includes('thành công') || log.includes('ĐÃ BẬT') || log.includes('lên cấp')
                          ? 'text-emerald-400'
                          : 'text-amber-200/90'
                      }
                    >
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-stone-950 border-t border-stone-800 flex items-center justify-between">
              <span className="text-[11px] text-stone-400">
                Mẹo: Bấm phím <b>5</b> trong game để mở menu Lệnh Bài Admin trực quan.
              </span>
              <button
                onClick={() => setShowGmModal(false)}
                className="px-4 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-white font-semibold text-xs transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SHARE & CLOUDFLARE 1-FILE DEPLOY */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-stone-900 border border-amber-600/60 rounded-xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 border-b border-amber-700/40 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-base font-sans">
                <Globe className="w-5 h-5 text-emerald-400" />
                <span>HƯỚNG DẪN LẤY LINK CHƠI ONLINE VĨNH VIỄN</span>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 rounded hover:bg-stone-700 text-stone-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-stone-800 bg-stone-950 px-5 pt-2 gap-2 text-xs overflow-x-auto font-sans">
              <button
                onClick={() => setActiveShareTab('cloudflare')}
                className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 font-bold transition whitespace-nowrap ${
                  activeShareTab === 'cloudflare'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <Cloud className="w-4 h-4 text-orange-400" />
                <span>1 File Lên Cloudflare Pages (Khuyên Dùng)</span>
              </button>
              <button
                onClick={() => setActiveShareTab('netlify')}
                className={`pb-2.5 px-3 border-b-2 font-bold transition whitespace-nowrap ${
                  activeShareTab === 'netlify'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                Netlify Drop
              </button>
              <button
                onClick={() => setActiveShareTab('github')}
                className={`pb-2.5 px-3 border-b-2 font-bold transition whitespace-nowrap ${
                  activeShareTab === 'github'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                GitHub Pages
              </button>
              <button
                onClick={() => setActiveShareTab('vercel')}
                className={`pb-2.5 px-3 border-b-2 font-bold transition whitespace-nowrap ${
                  activeShareTab === 'vercel'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                Vercel
              </button>
              <button
                onClick={() => setActiveShareTab('direct')}
                className={`pb-2.5 px-3 border-b-2 font-bold transition whitespace-nowrap ${
                  activeShareTab === 'direct'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                Link Trực Tiếp
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs text-stone-300 leading-relaxed font-sans">
              {/* CLOUDFLARE TAB */}
              {activeShareTab === 'cloudflare' && (
                <div className="space-y-4">
                  {/* Explanation of the 10KB issue */}
                  <div className="bg-amber-950/40 border border-amber-600/50 rounded-lg p-3.5 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-300 text-sm">
                        Khắc Phục Lỗi Tải Về 10KB (Đăng Nhập Google)
                      </h4>
                      <p className="text-stone-300 text-xs mt-1">
                        Khi tải trực tiếp bằng trình duyệt qua liên kết ngoài của Cloud Run, máy chủ yêu cầu xác thực Google dẫn tới việc lưu nhầm trang đăng nhập (khoảng <b>10.33 KB</b>). 
                        Nút tải dưới đây sử dụng <b>cơ chế Stream bộ nhớ đệm xác thực nội bộ</b> và có sẵn <b>link dự phòng Gofile</b>, cam kết tải đủ 100% tệp ZIP <b>49.2 MB</b>!
                      </p>
                    </div>
                  </div>

                  {/* 1-File Download Card */}
                  <div className="bg-gradient-to-r from-stone-900 to-stone-950 border border-orange-500/50 rounded-xl p-4 shadow-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-orange-950/80 rounded-lg border border-orange-500/40">
                          <UploadCloud className="w-6 h-6 text-orange-400" />
                        </div>
                        <div>
                          <div className="font-bold text-orange-300 text-sm flex items-center gap-2">
                            <span>volam_cloudflare_pages.zip</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600/40 font-mono">
                              49.2 MB Chuẩn 100%
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-400 mt-0.5">
                            Chứa toàn bộ 1.572 tệp, index.html ở thư mục gốc, kèm sẵn công cụ GM và Lệnh Bài Admin.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {isDownloading && (
                      <div className="bg-stone-950 p-3 rounded-lg border border-amber-500/40 space-y-1.5 animate-in fade-in">
                        <div className="flex justify-between text-xs text-amber-300 font-bold">
                          <span>{downloadSizeText}</span>
                          <span>{downloadProgress !== null ? `${downloadProgress}%` : ''}</span>
                        </div>
                        <div className="w-full bg-stone-800 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-amber-500 to-yellow-400 h-2.5 transition-all duration-200"
                            style={{ width: `${downloadProgress || 5}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Download Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <button
                        onClick={() => handleDownloadZipStream('volam_cloudflare_pages.zip')}
                        disabled={isDownloading}
                        className="py-2.5 px-4 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs shadow-md transition active:scale-98 flex items-center justify-center gap-2 border border-amber-400/30"
                      >
                        <Download className="w-4 h-4" />
                        <span>{isDownloading ? 'Đang Tải Stream...' : 'TẢI FILE ZIP CHO CLOUDFLARE'}</span>
                      </button>

                      <a
                        href={externalBackupLinks.cloudflareZip}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2.5 px-4 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold text-xs border border-amber-600/40 transition active:scale-98 flex items-center justify-center gap-2 text-center"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Link Dự Phòng Gofile (Không Lỗi 10KB)</span>
                      </a>
                    </div>
                  </div>

                  {/* 5-Step Instructions for Cloudflare Pages */}
                  <div className="space-y-2.5 bg-stone-950 p-4 rounded-xl border border-stone-800">
                    <div className="flex items-center justify-between">
                      <b className="text-amber-400 text-sm flex items-center gap-1.5">
                        <Cloud className="w-4 h-4 text-orange-400" />
                        5 Bước Đưa File Lên Cloudflare Pages (dash.cloudflare.com):
                      </b>
                      <a
                        href="https://dash.cloudflare.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-orange-400 hover:text-orange-300 flex items-center gap-1 text-[11px] font-bold underline"
                      >
                        <span>Mở dash.cloudflare.com</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <ol className="list-decimal list-inside space-y-2 text-stone-300 text-xs">
                      <li>
                        <b>Bước 1:</b> Tải tệp <code>volam_cloudflare_pages.zip</code> (49.2 MB) ở nút bên trên về máy tính hoặc điện thoại.
                      </li>
                      <li>
                        <b>Bước 2:</b> Truy cập trang quản trị{' '}
                        <a
                          href="https://dash.cloudflare.com"
                          target="_blank"
                          rel="noreferrer"
                          className="text-orange-400 underline font-bold"
                        >
                          dash.cloudflare.com
                        </a>{' '}
                        và đăng nhập (miễn phí 100%).
                      </li>
                      <li>
                        <b>Bước 3:</b> Ở thanh menu bên trái, nhấp chọn mục <b>Workers & Pages</b> ➔ bấm nút <b>Create application</b> ➔ chọn thẻ <b>Pages</b> ➔ chọn <b>Upload assets</b>.
                      </li>
                      <li>
                        <b>Bước 4:</b> Đặt tên cho dự án (ví dụ: <code>volam-offline</code>) ➔ <b>Kéo thả trực tiếp file ZIP vừa tải vào ô tải lên</b>.
                      </li>
                      <li>
                        <b>Bước 5:</b> Bấm <b>Deploy site</b>. Sau khoảng 5 giây, Cloudflare Pages sẽ cấp cho bạn đường link chơi vĩnh viễn:
                        <div className="p-2 bg-stone-900 rounded border border-stone-800 font-mono text-emerald-400 text-[11px] mt-1 select-all break-all">
                          https://volam-offline.pages.dev
                        </div>
                      </li>
                    </ol>
                  </div>
                </div>
              )}

              {/* NETLIFY TAB */}
              {activeShareTab === 'netlify' && (
                <div className="space-y-3 bg-stone-950 p-4 rounded-xl border border-stone-800">
                  <b className="text-emerald-300 text-sm block">Cách 2: Kéo Thả Lên Netlify Drop (Siêu Nhanh 10 Giây)</b>
                  <ol className="list-decimal list-inside space-y-2 text-stone-300 text-xs">
                    <li>
                      Tải file <code>volam_cloudflare_pages.zip</code> và giải nén ra 1 thư mục trên máy.
                    </li>
                    <li>
                      Mở trang{' '}
                      <a
                        href="https://app.netlify.com/drop"
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 underline font-bold"
                      >
                        app.netlify.com/drop
                      </a>.
                    </li>
                    <li>Kéo thả toàn bộ thư mục vừa giải nén vào ô <b>"Drag and drop your site folder here"</b>.</li>
                    <li>Sau 5 giây, Netlify cấp ngay đường link trực tiếp (dạng <code>https://ten-ngau-nhien.netlify.app</code>).</li>
                  </ol>
                </div>
              )}

              {/* GITHUB TAB */}
              {activeShareTab === 'github' && (
                <div className="space-y-3 bg-stone-950 p-4 rounded-xl border border-stone-800">
                  <b className="text-emerald-300 text-sm block">Cách 3: Dùng GitHub Pages Miễn Phí Vĩnh Viễn</b>
                  <ol className="list-decimal list-inside space-y-2 text-stone-300 text-xs">
                    <li>Tạo một repository mới trên GitHub (chế độ Public).</li>
                    <li>Giải nén file ZIP và tải tất cả các tệp lên repository (đảm bảo <code>index.html</code> nằm ở thư mục gốc).</li>
                    <li>Vào mục <b>Settings ➔ Pages</b>, chọn Branch <b>main</b> và thư mục <b>/ (root)</b> ➔ Bấm <b>Save</b>.</li>
                    <li>Sau 1 phút, trang web sẽ hoạt động tại địa chỉ <code>https://&lt;ten-ban&gt;.github.io/&lt;ten-repo&gt;/</code>.</li>
                  </ol>
                </div>
              )}

              {/* VERCEL TAB */}
              {activeShareTab === 'vercel' && (
                <div className="space-y-3 bg-stone-950 p-4 rounded-xl border border-stone-800">
                  <b className="text-emerald-300 text-sm block">Cách 4: Dùng Vercel Tốc Độ Băng Thông Cao</b>
                  <ol className="list-decimal list-inside space-y-2 text-stone-300 text-xs">
                    <li>
                      Truy cập{' '}
                      <a
                        href="https://vercel.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 underline font-bold"
                      >
                        Vercel.com
                      </a>{' '}
                      và đăng nhập tài khoản.
                    </li>
                    <li>Bấm <b>Add New... ➔ Project</b> và chọn tải lên thư mục dự án game.</li>
                    <li>Bấm <b>Deploy</b> để nhận đường link chia sẻ.</li>
                  </ol>
                </div>
              )}

              {/* DIRECT TAB */}
              {activeShareTab === 'direct' && (
                <div className="space-y-3 bg-stone-950 p-4 rounded-xl border border-stone-800">
                  <b className="text-emerald-300 text-sm block">Cách 5: Chia Sẻ Link Chơi Trực Tiếp Hiện Tại</b>
                  <div className="p-3 bg-stone-900 rounded border border-stone-800 space-y-2">
                    <div className="flex items-center justify-between text-stone-400 text-[11px]">
                      <span>Đường dẫn chơi trực tiếp:</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(getDirectPlayUrl());
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2500);
                        }}
                        className="flex items-center gap-1 text-emerald-400 font-bold hover:text-emerald-300"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Đã sao chép!' : 'Chép link'}</span>
                      </button>
                    </div>
                    <div className="font-mono text-amber-200 select-all break-all text-[11px]">
                      {getDirectPlayUrl()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-stone-950 border-t border-stone-800 flex items-center justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs transition"
              >
                Đã Hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DOWNLOAD FULL ZIP MODAL */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-stone-900 border border-amber-600/60 rounded-xl max-w-xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 border-b border-amber-700/40 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-base font-sans">
                <FolderArchive className="w-5 h-5 text-amber-400" />
                <span>TRUNG TÂM TẢI FILE GAME VỀ MÁY (OFFLINE)</span>
              </div>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="p-1 rounded hover:bg-stone-700 text-stone-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs text-stone-300 leading-relaxed font-sans">
              <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-950/80 rounded-lg border border-amber-600/40">
                    <FileArchive className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <b className="text-amber-300 text-sm block">VoLam_Offline_ChoiDon.zip (49.2 MB)</b>
                    <span className="text-stone-400 text-xs">
                      Bản offline trọn gói đầy đủ âm thanh, hình ảnh, 10 môn phái, Lệnh Bài Admin & GM cheat.
                    </span>
                  </div>
                </div>

                {isDownloading && (
                  <div className="bg-stone-900 p-3 rounded-lg border border-amber-500/40 space-y-1.5 animate-in fade-in">
                    <div className="flex justify-between text-xs text-amber-300 font-bold">
                      <span>{downloadSizeText}</span>
                      <span>{downloadProgress !== null ? `${downloadProgress}%` : ''}</span>
                    </div>
                    <div className="w-full bg-stone-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-yellow-400 h-2.5 transition-all duration-200"
                        style={{ width: `${downloadProgress || 5}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => handleDownloadZipStream('VoLam_Offline_ChoiDon.zip')}
                    disabled={isDownloading}
                    className="py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-stone-950 font-bold text-xs shadow-md transition active:scale-98 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isDownloading ? 'Đang Tải Stream...' : 'Tải Stream Về Máy'}</span>
                  </button>

                  <a
                    href={externalBackupLinks.offlineFullZip}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-4 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold text-xs border border-amber-600/40 transition active:scale-98 flex items-center justify-center gap-2 text-center"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Link Tải Gofile Dự Phòng</span>
                  </a>
                </div>
              </div>

              <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-2">
                <b className="text-amber-400 text-xs block">Cách Chơi Sau Khi Tải Về Máy:</b>
                <ol className="list-decimal list-inside space-y-1.5 text-stone-300 text-xs">
                  <li>Giải nén tệp <code>VoLam_Offline_ChoiDon.zip</code> ra thư mục trên máy.</li>
                  <li>Nhấp đúp chuột mở tệp <code>index.html</code> bằng trình duyệt (Chrome, Cốc Cốc, Edge, Safari).</li>
                  <li>Chơi mượt mà không cần kết nối internet hay cài đặt thêm phần mềm!</li>
                </ol>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-stone-950 border-t border-stone-800 flex items-center justify-end">
              <button
                onClick={() => setShowDownloadModal(false)}
                className="px-4 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-white font-semibold text-xs transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
