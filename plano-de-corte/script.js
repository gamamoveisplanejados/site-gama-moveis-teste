let state = {
    parts: [],
    selectedMaterials: ['BRANCO', 'PRETO'],
    cuttingResult: null,
    sheetWidth: 2750,
    sheetHeight: 1850
};

const availableMaterials = [
    { id: 1, name: 'Branco', color: '#FFFFFF', code: 'BRANCO', textColor: '#333' },
    { id: 2, name: 'Preto', color: '#1a1a1a', code: 'PRETO', textColor: '#fff' },
    { id: 3, name: 'Carvalho', color: '#8B6914', code: 'CARVALHO', textColor: '#fff' },
    { id: 4, name: 'Nogueira', color: '#5C4033', code: 'NOGUEIRA', textColor: '#fff' },
    { id: 5, name: 'Cerejeira', color: '#DEB887', code: 'CEREJEIRA', textColor: '#333' },
    { id: 6, name: 'Freijó', color: '#C4A35A', code: 'FREIJO', textColor: '#333' },
    { id: 7, name: 'Branco Neve', color: '#F0F0F0', code: 'BRANCO_NEVE', textColor: '#333' },
    { id: 8, name: 'Cinza', color: '#808080', code: 'CINZA', textColor: '#fff' },
    { id: 9, name: 'Azul', color: '#4169E1', code: 'AZUL', textColor: '#fff' },
    { id: 10, name: 'Vermelho', color: '#DC143C', code: 'VERMELHO', textColor: '#fff' }
];

document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    renderMaterialsGrid();
    renderPartsTable();
});

function initEventListeners() {
    document.getElementById('addPartBtn').addEventListener('click', addPart);
    document.getElementById('optimizeBtn').addEventListener('click', calculateOptimalCutting);
    document.getElementById('newCalcBtn').addEventListener('click', resetCalculation);
    
    document.querySelectorAll('.thickness-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.thickness-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    const bladeSlider = document.getElementById('bladeThickness');
    bladeSlider.addEventListener('input', (e) => {
        document.getElementById('bladeValue').textContent = e.target.value;
    });
    
    document.getElementById('sheetWidth').addEventListener('change', (e) => {
        state.sheetWidth = parseInt(e.target.value) || 2750;
    });
    document.getElementById('sheetHeight').addEventListener('change', (e) => {
        state.sheetHeight = parseInt(e.target.value) || 1850;
    });
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
             style="background: ${state.selectedMaterials.includes(material.code) ? `linear-gradient(135deg, ${material.color}20, ${material.color}10)` : 'var(--bg-tertiary)'}; color: ${material.textColor}"
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
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
                <p>Nenhuma peça adicionada</p>
                <span>Utilize o formulário ao lado para adicionar peças</span>
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
                        <td>${part.width} mm</td>
                        <td>${part.height} mm</td>
                        <td>${(part.width * part.height / 10000).toFixed(2)} m²</td>
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
            
            for (let y = 0; y <= this.sheetHeight - h; y += 10) {
                for (let x = 0; x <= this.sheetWidth - w; x += 10) {
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
    const sheetThickness = parseInt(document.querySelector('.thickness-option.active').dataset.thickness);
    const maxSheets = 10;

    if (state.parts.length === 0) {
        alert('Adicione pelo menos uma peça!');
        return;
    }

    const optimizeBtn = document.getElementById('optimizeBtn');
    optimizeBtn.disabled = true;
    optimizeBtn.innerHTML = '<div class="spinner-small"></div> Otimizando...';

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
                        material: state.selectedMaterials[usedSheets.length % state.selectedMaterials.length],
                        thickness: sheetThickness
                    });
                }
            }
        }

        const finalSheets = usedSheets.slice(0, maxSheets);
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
                thickness: sheet.thickness,
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
        
        optimizeBtn.disabled = false;
        optimizeBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Otimizar Corte';
    }, 500);
}

function renderResults() {
    const resultDiv = document.getElementById('resultDisplay');
    const r = state.cuttingResult;
    
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <div class="results-header">
            <h2>📐 Plano de Corte Otimizado</h2>
            <div class="export-buttons">
                <button class="export-btn dxf" onclick="exportDXF()">🎨 DXF</button>
                <button class="export-btn gcode" onclick="exportGCode()">⚙️ G-Code</button>
                <button class="export-btn pdf" onclick="exportPDF()">📄 PDF</button>
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-value">${r.totalSheets}</div><div class="stat-label">Chapas</div></div>
            <div class="stat-card"><div class="stat-value">${r.totalParts}</div><div class="stat-label">Peças</div></div>
            <div class="stat-card"><div class="stat-value">${r.efficiency}%</div><div class="stat-label">Aproveitamento</div></div>
            <div class="stat-card"><div class="stat-value">${(r.totalAreaUsed/1000000).toFixed(2)}m²</div><div class="stat-label">Área Útil</div></div>
        </div>
        
        <div class="sheets-grid">
            ${r.sheets.map((sheet, idx) => `
                <div class="sheet-card">
                    <div class="sheet-header">
                        <strong>CHAPA ${sheet.id}</strong>
                        <span class="sheet-badge">${sheet.material} | ${sheet.thickness}mm</span>
                    </div>
                    <div class="sheet-info">
                        Aproveitamento: <strong>${sheet.utilizationRate}%</strong> | Dimensões: ${r.sheetWidth}×${r.sheetHeight}mm
                    </div>
                    <div class="sheet-visualization">
                        <canvas id="sheet-canvas-${idx}" width="350" height="250" class="sheet-canvas"></canvas>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    r.sheets.forEach((sheet, idx) => {
        drawTechnicalVisualization(sheet, idx, r.sheetWidth, r.sheetHeight, r.bladeThickness);
    });
}

function drawTechnicalVisualization(sheet, idx, sheetWidth, sheetHeight, bladeThickness) {
    const canvas = document.getElementById(`sheet-canvas-${idx}`);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const scale = Math.min(canvas.width / sheetWidth, canvas.height / sheetHeight) * 0.85;
    const offsetX = (canvas.width - sheetWidth * scale) / 2;
    const offsetY = (canvas.height - sheetHeight * scale) / 2;
    
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    // Fundo escuro estilo CAD
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid técnico
    ctx.strokeStyle = '#1a2a3a';
    ctx.lineWidth = 0.5;
    const gridSpacing = 50 * scale;
    for (let x = 0; x < canvas.width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Contorno da chapa
    ctx.strokeStyle = '#00b4d8';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, sheetWidth * scale, sheetHeight * scale);
    
    // Cantos da chapa
    ctx.fillStyle = '#00b4d8';
    const cornerSize = 5;
    ctx.fillRect(offsetX - cornerSize, offsetY - cornerSize, cornerSize, cornerSize);
    ctx.fillRect(offsetX + sheetWidth * scale, offsetY - cornerSize, cornerSize, cornerSize);
    ctx.fillRect(offsetX - cornerSize, offsetY + sheetHeight * scale, cornerSize, cornerSize);
    ctx.fillRect(offsetX + sheetWidth * scale, offsetY + sheetHeight * scale, cornerSize, cornerSize);
    
    // Cota da chapa
    ctx.fillStyle = '#6c6c7e';
    ctx.font = '10px Inter';
    ctx.fillText(`${sheetWidth} mm`, offsetX + sheetWidth * scale / 2 - 25, offsetY - 5);
    ctx.fillText(`${sheetHeight} mm`, offsetX - 35, offsetY + sheetHeight * scale / 2);
    
    // Cores para as peças
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7D794'];
    
    sheet.placements.forEach((part, i) => {
        const x = offsetX + part.x * scale;
        const y = offsetY + part.y * scale;
        const w = part.width * scale;
        const h = part.height * scale;
        
        // Preenchimento da peça com transparência
        ctx.fillStyle = colors[i % colors.length] + '40';
        ctx.fillRect(x, y, w, h);
        
        // Contorno da peça
        ctx.strokeStyle = colors[i % colors.length];
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);
        
        // Diagonal para efeito técnico
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y + h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + w, y);
        ctx.lineTo(x, y + h);
        ctx.stroke();
        
        // Texto da peça
        ctx.fillStyle = colors[i % colors.length];
        ctx.font = `bold ${Math.min(12, part.height * scale / 5)}px Inter`;
        ctx.fillText(part.name.substring(0, 6), x + 5, y + 15);
        
        // Dimensões
        ctx.fillStyle = '#a0a0b0';
        ctx.font = `${Math.min(9, part.height * scale / 6)}px Inter`;
        ctx.fillText(`${part.originalWidth}×${part.originalHeight}`, x + 5, y + 30);
        
        // Cota individual
        ctx.fillStyle = '#6c6c7e';
        ctx.font = '8px Inter';
        if (part.width * scale > 40) {
            ctx.fillText(`${part.originalWidth}mm`, x + w / 2 - 15, y + h + 12);
        }
        if (part.height * scale > 30) {
            ctx.save();
            ctx.translate(x - 8, y + h / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(`${part.originalHeight}mm`, 0, 0);
            ctx.restore();
        }
    });
    
    // Legenda
    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(10, canvas.height - 60, 150, 50);
    ctx.strokeStyle = '#00b4d8';
    ctx.strokeRect(10, canvas.height - 60, 150, 50);
    ctx.fillStyle = '#00b4d8';
    ctx.font = '9px Inter';
    ctx.fillText(`Ferramenta: Φ${bladeThickness}mm`, 18, canvas.height - 45);
    ctx.fillStyle = '#20c997';
    ctx.fillText(`Aproveitamento: ${sheet.utilizationRate}%`, 18, canvas.height - 30);
    ctx.fillStyle = '#fd7e14';
    ctx.fillText(`Peças: ${sheet.placements.length}`, 18, canvas.height - 15);
}

function exportDXF() { alert('Exportação DXF em desenvolvimento...\n\nEm breve disponível!'); }
function exportGCode() { alert('Exportação G-Code em desenvolvimento...\n\nEm breve disponível!'); }
function exportPDF() { alert('Exportação PDF em desenvolvimento...\n\nEm breve disponível!'); }

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

window.removePart = removePart;
window.toggleMaterial = toggleMaterial;
window.exportDXF = exportDXF;
window.exportGCode = exportGCode;
window.exportPDF = exportPDF;
