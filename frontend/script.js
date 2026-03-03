const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('fileInput');
const uploadPlaceholder = document.getElementById('upload-placeholder');
const fileInfo = document.getElementById('file-info');
const filenameDisplay = document.getElementById('filename');
const filesizeDisplay = document.getElementById('filesize');
const sortBtn = document.getElementById('sortBtn');
const removeFileBtn = document.getElementById('removeFileBtn');
const alertBox = document.getElementById('alert-box');
const alertTitle = document.getElementById('alert-title');
const alertMessage = document.getElementById('alert-message');
const alertIcon = document.getElementById('alert-icon');
const visBtn = document.getElementById('visBtn');

// Các biến toàn cục cho phần Minh họa
let selectedFile = null;
let visHistory = [];
let currentVisStep = 0;
let currentVisSpeed = 500;
let isAutoPlaying = false;
let autoPlayInterval = null;

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function showAlert(title, message, type = 'error') {
    alertBox.classList.remove('hidden');
    alertTitle.innerText = title;
    alertMessage.innerText = message;
    alertBox.className = 'mb-6 p-4 rounded-lg text-sm flex items-start gap-3 border shadow-sm';
    alertIcon.className = 'fa-solid mt-0.5 text-base';
    if (type === 'success') {
        alertBox.classList.add('bg-emerald-50', 'border-emerald-100', 'text-emerald-800');
        alertIcon.classList.add('fa-circle-check', 'text-emerald-600');
    } else {
        alertBox.classList.add('bg-red-50', 'border-red-100', 'text-red-800');
        alertIcon.classList.add('fa-circle-exclamation', 'text-red-600');
    }
    if (type !== 'success') setTimeout(() => alertBox.classList.add('hidden'), 5000);
}

function setAppState(state) {
    alertBox.classList.add('hidden');
    dropZone.classList.remove('border-blue-500', 'bg-blue-50/30'); 
    dropZone.classList.add('border-slate-300', 'border-dashed');

    if (state === 'idle') {
        selectedFile = null; 
        fileInput.value = '';
        uploadPlaceholder.classList.remove('hidden');
        fileInfo.classList.add('hidden');
        sortBtn.disabled = true; 
        if (visBtn) {
            visBtn.classList.add('hidden');
            visBtn.classList.remove('flex');
            visBtn.disabled = true;
        }
        dropZone.classList.remove('pointer-events-none', 'opacity-50');
    } else if (state === 'selected') {
        uploadPlaceholder.classList.add('hidden');
        fileInfo.classList.remove('hidden'); 
        dropZone.classList.remove('border-dashed', 'border-slate-300'); 
        dropZone.classList.add('border-solid', 'border-blue-200'); 
        sortBtn.disabled = false; 
        
        if (visBtn) {
            visBtn.classList.remove('hidden');
            visBtn.classList.add('flex');
            visBtn.disabled = false;
        }
    } else if (state === 'processing') {
        sortBtn.disabled = true; 
        if (visBtn) visBtn.disabled = true;
        dropZone.classList.add('pointer-events-none', 'opacity-50');
    }
}

dropZone.addEventListener('click', () => fileInput.click());
removeFileBtn.addEventListener('click', (e) => { e.stopPropagation(); setAppState('idle'); });

// Mở Settings khi bấm nút Minh họa
if (visBtn) {
    visBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openVisSettings();
    });
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add('border-blue-500', 'bg-blue-50/60');
    });
});
['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500', 'bg-blue-50/60');
    });
});
dropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => {
    if (fileInput.files.length) handleFileSelect(fileInput.files[0]);
});

function handleFileSelect(file) {
    if (!file.name.endsWith('.bin')) {
        showAlert("Định dạng không hỗ trợ", "Hệ thống chỉ chấp nhận file .bin", "error");
        return;
    }
    selectedFile = file;
    filenameDisplay.innerText = file.name;
    filesizeDisplay.innerText = formatBytes(file.size);
    setAppState('selected');
}

async function processSort() {
    if (!selectedFile) return;
    setAppState('processing');
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
        const response = await fetch("/sort-binary-file/", { method: "POST", body: formData });
        if (!response.ok) throw new Error("Lỗi Server");
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = "sorted_" + selectedFile.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setAppState('idle');
        showAlert("Hoàn tất!", "Dữ liệu đã được xử lý thành công.", "success");
    } catch (error) {
        setAppState('selected');
        showAlert("Thất bại", error.message, "error");
    }
}

async function generateDummyData() {
    const btn = document.getElementById('confirmGenerateBtn');
    const originalText = btn.innerHTML;
    
    const fileName = document.getElementById('genFileName').value || 'dummy_data.bin';
    const fileSize = parseFloat(document.getElementById('genFileSize').value) || 50;
    const fileUnit = document.getElementById('genFileUnit').value;

    let totalBytes = 0;
    if (fileUnit === 'GB') totalBytes = fileSize * 1024 * 1024 * 1024;
    else if (fileUnit == 'MB') totalBytes = fileSize * 1024 * 1024; 
    else if (fileUnit == 'KB') totalBytes = fileSize * 1024;
    
    const totalNumbers = Math.floor(totalBytes / 8);

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Đang tạo...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/generate-test-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_name: fileName, total_numbers: totalNumbers, range_limit: 2000000000 })
        });
        if (!response.ok) throw new Error("Lỗi Server khi tạo file");

        const blob = await response.blob(); 
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = fileName; 
        document.body.appendChild(a);
        a.click(); 
        a.remove();
        document.getElementById('generateModal').classList.add('hidden');
        showAlert("Thành công", `Đã tải xuống ${fileName}`, "success");
    } catch (error) {
        showAlert("Thất bại", error.message, "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
} 

function openVisSettings() {
    if (!selectedFile) return;
    if (selectedFile.size > 512000) { 
        showAlert("File quá lớn", "Vui lòng tạo file mẫu < 500 KB để minh họa!", "error");
        return;
    }
    document.getElementById('visSettingsModal').classList.remove('hidden');
    document.getElementById('visSettingsModal').classList.add('flex');
}

function closeVisSettings() {
    document.getElementById('visSettingsModal').classList.add('hidden');
    document.getElementById('visSettingsModal').classList.remove('flex');
}

async function confirmAndStartVis() {
    const chunkSize = document.getElementById('visChunkSize').value || 10;
    currentVisSpeed = parseInt(document.getElementById('visSpeed').value) || 500;
    closeVisSettings();
    
    visBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Đang phân tích...';
    visBtn.disabled = true;

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("chunk_size", chunkSize); 

    try {
        const response = await fetch("/api/visualize-sort/", { method: "POST", body: formData });
        if (!response.ok) throw new Error("Lỗi Server");
        
        const data = await response.json();
        visHistory = data.history;
        currentVisStep = 0;
        
        document.getElementById('visModal').classList.remove('hidden');
        document.getElementById('visCanvas').innerHTML = `
            <div class="text-center mb-8 animate-[fadeIn_0.5s]">
                <div class="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-bold border border-blue-200">
                    Khởi tạo External Merge Sort (RAM: ${data.chunk_size_used} số / file)
                </div>
            </div>
        `;
        
        isAutoPlaying = true;
        updateNextButtonState();
        clearInterval(autoPlayInterval);
        autoPlayInterval = setInterval(nextVisStep, currentVisSpeed);
        
    } catch (error) {
        showAlert("Lỗi", error.message, "error");
    } finally {
        visBtn.innerHTML = '<i class="fa-solid fa-clapperboard"></i> <span>Minh họa Thuật toán</span>';
        visBtn.disabled = false;
    }
}

function updateNextButtonState() {
    const btn = document.getElementById('visNextBtn');
    if (!btn) return;
    if (isAutoPlaying) {
        btn.innerHTML = '<i class="fa-solid fa-pause mr-2"></i> Tạm dừng';
        btn.className = "px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2";
    } else {
        btn.innerHTML = '<span>Tiếp tục chạy</span> <i class="fa-solid fa-play"></i>';
        btn.className = "px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2";
    }
}

function toggleAutoPlay() {
    if (currentVisStep >= visHistory.length) return;
    isAutoPlaying = !isAutoPlaying;
    updateNextButtonState();
    
    if (isAutoPlaying) {
        autoPlayInterval = setInterval(nextVisStep, currentVisSpeed);
        nextVisStep();
    } else {
        clearInterval(autoPlayInterval);
    }
}

const visNextBtn = document.getElementById('visNextBtn');
if (visNextBtn) visNextBtn.onclick = toggleAutoPlay;

function closeVisModal() {
    clearInterval(autoPlayInterval);
    isAutoPlaying = false;
    document.getElementById('visModal').classList.add('hidden');
}

function prevVisStep() {
    if (currentVisStep <= 0) return; 
    
    if (isAutoPlaying) {
        isAutoPlaying = false;
        clearInterval(autoPlayInterval);
        updateNextButtonState();
    }
    
    const canvas = document.getElementById('visCanvas');
    if (canvas.children.length > 1) { 
        canvas.removeChild(canvas.lastElementChild);
    }
    
    currentVisStep--; 
    
    if (currentVisStep < visHistory.length) {
        const btn = document.getElementById('visNextBtn');
        if (btn) btn.onclick = toggleAutoPlay;
        updateNextButtonState();
    }
}

function nextVisStep() {
    if (currentVisStep >= visHistory.length) {
        clearInterval(autoPlayInterval);
        isAutoPlaying = false;
        const btn = document.getElementById('visNextBtn');
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-check mr-2"></i> Hoàn tất thuật toán';
            btn.className = "px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-2";
            btn.onclick = closeVisModal;
        }
        return;
    }
    
    const step = visHistory[currentVisStep];
    const canvas = document.getElementById('visCanvas');
    const stepDiv = document.createElement('div');
    stepDiv.className = "p-5 bg-white rounded-xl shadow border border-slate-200 animate-[fadeIn_0.3s_ease-out]";

    if (step.action === "CREATE_TEMP") {
        const sampleText = step.sample.map(n => typeof n === 'number' ? n.toFixed(2) : n).join(', ');
        stepDiv.innerHTML = `
            <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center"><i class="fa-solid fa-file-code"></i></div>
                <div>
                    <h4 class="font-bold text-slate-800">Tạo File Tạm: <span class="text-emerald-600 font-mono">${step.file_name}</span></h4>
                </div>
            </div>
            <div class="bg-slate-50 p-3 rounded-lg border text-sm font-mono text-slate-600">Dữ liệu: [ ${sampleText} ]</div>
        `;
    } else if (step.action === "MERGE_FILES") {
        const isFinal = step.is_final;
        const color = isFinal ? "purple" : "blue";
        stepDiv.innerHTML = `
            <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-lg bg-${color}-100 text-${color}-600 flex items-center justify-center"><i class="fa-solid fa-code-merge"></i></div>
                <div>
                    <h4 class="font-bold text-slate-800">${isFinal ? 'TRỘN FILE KẾT QUẢ' : 'Trộn File Tạm'}</h4>
                </div>
            </div>
            <div class="flex flex-wrap gap-2 text-xs font-mono items-center mt-2 bg-slate-50 p-3 rounded-lg border">
                ${step.inputs.join(' + ')} <i class="fa-solid fa-arrow-right mx-2 text-${color}-500"></i> <span class="font-bold text-${color}-700">${step.output}</span>
            </div>
        `;
    }

    canvas.appendChild(stepDiv);
    const scrollContainer = document.getElementById('visModal').querySelector('.overflow-auto');
    if (scrollContainer) scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
    currentVisStep++;
}