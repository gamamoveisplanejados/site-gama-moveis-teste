// Estado da aplicação
let state = {
    parts: [],
    selectedMaterials: ['BRANCO', 'PRETO'],
    cuttingResult: null,
    editingPartId: null,
    sheetWidth: 2750,
    sheetHeight: 1850
};

// Materiais disponíveis
const availableMaterials = [
    { id: 1, name: 'MDF Branco', color: '#FFFFFF', code: 'BRANCO', textColor: '#333' },
    { id: 2, name: 'MDF Preto', color: '#1a1a1a', code: 'PRETO', textColor: '#fff' },
    { id: 3, name: 'MDF Carvalho', color: '#8B6914', code: 'CARVALHO', textColor: '#fff' },
    { id: 4, name: 'MDF Nogueira', color: '#5C4033', code: 'NOGUEIRA', textColor: '#fff' },
    { id: 5, name: 'MDF Cerejeira', color: '#DEB887', code: 'CEREJEIRA', textColor: '#333' },
    { id: 6, name: 'MDF Freijó', color: '#C4A35A', code: 'FREIJO', textColor: '#333' },
    { id: 7, name: 'MDF Branco Neve', color: '#F0F0F0', code: 'BRANCO_NEVE', textColor: '#333' },
    { id: 8, name: 'MDF Cinza', color: '#808080', code: 'CINZA', textColor: '#fff' },
    { id: 9, name: 'MDF Azul', color: '#4169E1', code: 'AZUL', textColor: '#fff' },
    { id: 10, name: 'MDF Vermelho', color: '#DC143C', code: 'VERMELHO', textColor: '#fff' }
];

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    renderMaterialsGrid();
    renderPartsTable();
    updateSheetDimensions();
});

function initEventListeners() {
    document.getElementById('addPartBtn').addEventListener('click', addPart);
    document.getElementById('optimizeBtn').addEventListener('click', calculateOptimalCutting);
    document.getElementById('newCalcBtn').addEventListener('click', resetCalculation);
    
    // Espessura da chapa
    document.querySelectorAll('.chip[data-thickness]').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.chip[data-thickness]').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            updateSheetDimensions();
        });
    });
    
    // Espessura da serra slider
    const bladeSlider = document.getElementById('bladeThickness');
    bladeSlider.addEventListener('input', (e) => {
        document.getElementById('bladeValue').textContent = e.target.value + ' mm';
    });
    
    // Dimensões da chapa
    document.getElementById('sheetWidth').addEventListener('change', updateSheetDimensions);
    document.getElementById('sheetHeight').addEventListener('change', updateSheetDimensions);
}

function updateSheetDimensions() {
    state.sheetWidth = parseInt(document.getElementById('sheetWidth').value) || 2750;
    state.sheetHeight = parseInt(document.getElementById('sheetHeight').value) || 1850;
}

function resetCalculation() {
    state.parts = [];
    state.cuttingResult = null;
    renderPartsTable();
    document.getElementById('resultDisplay').style.display = 'none';
}

function renderMaterialsGrid() {
    const grid = document.getElementById('materialsGrid');
    grid.innerHTML = availableMaterials.map(material => `
        <div class="material-card ${state.selectedMaterials.includes(material.code) ? 'selected' : ''}"
             style="background: ${material.color}; color: ${material.textColor}"
             onclick="toggleMaterial('${material.code}')">
            <span>${material.name}</span>
            ${state.selectedMaterials.includes(material.code) ? '<span>✓</span>' : ''}
        </div>
    `).join('');
}

function toggleMaterial(code) {
    if (state.selectedMaterials.includes(code)) {
        state.selectedMaterials = state.selectedMaterials.filter(m => m !== code);
    } else {
        state.selectedMaterials.push(code);
    }
    renderMaterialsGrid();
}

function addPart() {
    const name = document.getElementById('partName').value.trim();
    const width = parseFloat(document.getElementById('partWidth').value);
    const height = parseFloat(document.getElementById('partHeight').value);
    const quantity = parseInt(document.getElementById('partQuantity').value);

    if (!name || isNaN(width) || isNaN(height) || width <= 0 || height <= 0 || quantity <= 0) {
        alert('Preencha todos os campos corretamente');
        return;
    }

    for (let i = 0; i < quantity; i++) {
        state.parts.push({
            id: Date.now() + i + Math.random(),
            name: name,
            width: width,
            height: height
        });
    }

    document.getElementById('partName').value = '';
    document.getElementById('partWidth').value = '';
    document.getElementById('partHeight').value = '';
    document.getElementById('partQuantity').value = '1';
    
    renderPartsTable();
}

function removePart(id) {
    state.parts = state.parts.filter(p => p.id !== id);
    renderPartsTable();
}

function renderPartsTable() {
    const container = document.getElementById('partsTable');
    const countSpan = document.getElementById('partsCount');
    countSpan.textContent = state.parts.length;

    if (state.parts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <p>Sua lista está vazia</p>
                <span>Adicione peças abaixo para começar</span>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <table class="parts-table">
            <thead>
                <tr><th>Peça</th><th>Base</th><th>Altura</th><th>Área</th><th></th></tr>
            </thead>
            <tbody>
                ${state.parts.map(part => `
                    <tr>
                        <td><strong>${escapeHtml(part.name)}</strong></td>
                        <td>${part.width}mm</td>
                        <td>${part.height}mm</td>
                        <td>${(part.width * part.height / 10000).toFixed(2)}m²</td>
                        <td class="part-actions">
                            <button onclick="removePart(${part.id})" title="Remover">🗑️</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Algoritmo de Nesting (mesmo da versão anterior)
class NestingOptimizer {
    constructor(sheetWidth, sheetHeight, bladeThickness) {
        this.sheetWidth = sheetWidth;
        this.sheetHeight = sheetHeight;
        this.bladeThickness = bladeThickness;
        this.placements = [];
    }

    findBestPosition(part, rotations = true) {
        let bestPosition = null;
        let bestY = Infinity;
        
        const orientations = rotations ? [
            { width: part.width, height: part.height, rotated: false },
            { width: part.height, height: part.width, rotated: true }
        ] : [
            { width: part.width, height: part.height, rotated: false }
        ];
        
        for (const orientation of orientations) {
            const w = orientation.width;
            const h = orientation.height;
            
            for (let y = 0; y <= this.sheetHeight - h; y += 5) {
                for (let x = 0; x <= this.sheetWidth - w; x += 5) {
                    if (this.isValidPosition(x, y, w, h)) {
                        if (y < bestY) {
                            bestY = y;
                            bestPosition = { x, y, ...orientation };
                        }
                    }
                }
            }
        }
        return bestPosition;
    }
    
    isValidPosition(x, y, width, height) {
        if (x < 0 || y < 0 || x + width > this.sheetWidth || y + height > this.sheetHeight) {
            return false;
        }
        
        for (const placed of this.placements) {
            const margin = this.bladeThickness;
            if (!(x + width + margin <= placed.x ||
                  x >= placed.x + placed.width + margin ||
                  y + height + margin <= placed.y ||
                  y >= placed.y + placed.height + margin)) {
                return false;
            }
        }
        return true;
    }
    
    addPart(part, position) {
        this.placements.push({
            id: part.id,
            name: part.name,
            x: position.x,
            y: position.y,
            width: position.width,
            height: position.height,
            rotated: position.rotated,
            originalWidth: part.width,
            originalHeight: part.height
        });
    }
    
    getUtilizationRate() {
        let usedArea = this.placements.reduce((sum, p) => sum + (p.width * p.height), 0);
        return (usedArea / (this.sheetWidth * this.sheetHeight)) * 100;
    }
}

function calculateOptimalCutting() {
    const bladeThickness = parseFloat(document.getElementById('bladeThickness').value);
    const sheetThickness = parseInt(document.querySelector('.chip.active').dataset.thickness);
    const sheetsCount = 10; // Máximo de chapas

    if (state.parts.length === 0) {
        alert('Adicione pelo menos uma peça!');
        return;
    }

    const optimizeBtn = document.getElementById('optimizeBtn');
    optimizeBtn.textContent = '⏳ Otimizando...';
    optimizeBtn.disabled = true;

    showLoading('Gerando plano de corte otimizado...');

    setTimeout(() => {
        const sortedParts = [...state.parts].sort((a, b) => (b.width * b.height) - (a.width * a.height));
        const usedSheets = [];

        for (const part of sortedParts) {
            let placed = false;
            
            for (const sheet of usedSheets) {
                const position = sheet.optimizer.findBestPosition(part, true);
                if (position) {
                    sheet.optimizer.addPart(part, position);
                    placed = true;
                    break;
                }
            }
            
            if (!placed) {
                const newOptimizer = new NestingOptimizer(state.sheetWidth, state.sheetHeight, bladeThickness);
                const position = newOptimizer.findBestPosition(part, true);
                if (position) {
                    newOptimizer.addPart(part, position);
                    usedSheets.push({
                        id: usedSheets.length + 1,
                        optimizer: newOptimizer,
                        material: state.selectedMaterials[usedSheets.length % state.selectedMaterials.length]
                    });
                }
            }
        }

        const finalSheets = usedSheets.slice(0, sheetsCount);
        let totalAreaUsed = 0;
        let totalAreaAvailable = 0;
        
        finalSheets.forEach(sheet => {
            const sheetArea = state.sheetWidth * state.sheetHeight;
            const usedArea = sheet.optimizer.placements.reduce((sum, p) => sum + (p.width * p.height), 0);
            totalAreaUsed += usedArea;
            totalAreaAvailable += sheetArea;
        });
        
        const efficiency = ((totalAreaUsed / totalAreaAvailable) * 100).toFixed(1);
        
        state.cuttingResult = {
            sheets: finalSheets.map(sheet => ({
                id: sheet.id,
                material: sheet.material,
                placements: sheet.optimizer.placements,
                utilizationRate: sheet.optimizer.getUtilizationRate().toFixed(1)
            })),
            totalSheets: finalSheets.length,
            totalParts: state.parts.length,
            totalAreaUsed,
            totalAreaAvailable,
            efficiency,
            bladeThickness,
            sheetThickness,
            sheetWidth: state.sheetWidth,
            sheetHeight: state.sheetHeight
        };
        
        hideLoading();
        renderResults();
        
        optimizeBtn.textContent = '⚡ Gerar Plano de Corte';
        optimizeBtn.disabled = false;
    }, 500);
}

function renderResults() {
    const resultDiv = document.getElementById('resultDisplay');
    const r = state.cuttingResult;
    
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <div class="result-header">
            <h2>📐 Plano de Corte Otimizado</h2>
            <div class="export-buttons">
                <button class="export-btn dxf" onclick="exportDXF()">🎨 Exportar DXF</button>
                <button class="export-btn gcode" onclick="exportGCode()">⚙️ Exportar G-Code</button>
                <button class="export-btn pdf" onclick="exportPDF()">📄 Exportar PDF</button>
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-value">${r.totalSheets}</div><div class="stat-label">Chapas Necessárias</div></div>
            <div class="stat-card"><div class="stat-value">${r.totalParts}</div><div class="stat-label">Total de Peças</div></div>
            <div class="stat-card"><div class="stat-value">${r.efficiency}%</div><div class="stat-label">Aproveitamento</div></div>
            <div class="stat-card"><div class="stat-value">${(r.totalAreaUsed/1000000).toFixed(2)}m²</div><div class="stat-label">Área Utilizada</div></div>
        </div>
        
        <div class="sheets-grid">
            ${r.sheets.map((sheet, idx) => `
                <div class="sheet-card">
                    <div class="sheet-header">
                        <strong>Chapa #${sheet.id}</strong> - ${sheet.material}
                        <span style="float:right">${sheet.utilizationRate}% aproveitamento</span>
                    </div>
                    <div class="sheet-info">
                        <strong>Peças:</strong> ${sheet.placements.length}<br>
                        <strong>Dimensões:</strong> ${r.sheetWidth}×${r.sheetHeight}mm
                    </div>
                    <div class="sheet-visualization">
                        <canvas id="sheet-canvas-${idx}" width="300" height="200" style="border:1px solid #ddd; border-radius:8px"></canvas>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Desenhar visualizações
    r.sheets.forEach((sheet, idx) => {
        drawSheetVisualization(sheet, idx, r.sheetWidth, r.sheetHeight);
    });
}

function drawSheetVisualization(sheet, idx, sheetWidth, sheetHeight) {
    const canvas = document.getElementById(`sheet-canvas-${idx}`);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const scale = Math.min(canvas.width / sheetWidth, canvas.height / sheetHeight) * 0.9;
    const offsetX = (canvas.width - sheetWidth * scale) / 2;
    const offsetY = (canvas.height - sheetHeight * scale) / 2;
    
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#adb5bd';
    ctx.strokeRect(offsetX, offsetY, sheetWidth * scale, sheetHeight * scale);
    
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
    
    sheet.placements.forEach((part, i) => {
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(offsetX + part.x * scale, offsetY + part.y * scale, part.width * scale, part.height * scale);
        ctx.strokeStyle = '#333';
        ctx.strokeRect(offsetX + part.x * scale, offsetY + part.y * scale, part.width * scale, part.height * scale);
        
        ctx.fillStyle = '#000';
        ctx.font = '10px Inter';
        ctx.fillText(part.name.substring(0, 8), offsetX + part.x * scale + 5, offsetY + part.y * scale + 15);
    });
}

// Funções de exportação
function exportDXF() { alert('Exportação DXF em desenvolvimento...'); }
function exportGCode() { alert('Exportação G-Code em desenvolvimento...'); }
function exportPDF() { 
    alert('Exportação PDF em desenvolvimento...\n\nEm breve esta funcionalidade estará disponível!');
}

function showLoading(msg) {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `<div class="loading-content"><div class="spinner"></div><p>${msg}</p></div>`;
    document.body.appendChild(overlay);
}

function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) overlay.remove();
}

// Tornar funções globais
window.removePart = removePart;
window.toggleMaterial = toggleMaterial;
window.exportDXF = exportDXF;
window.exportGCode = exportGCode;
window.exportPDF = exportPDF;