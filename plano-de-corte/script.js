let state = {
    parts: [],
    selectedMaterials: ['BRANCO', 'PRETO'],
    cuttingResult: null,
    sheetWidth: 2750,
    sheetHeight: 1850
};

const availableMaterials = [
    { id: 1, name: 'Branco', color: '#FFFFFF', code: 'BRANCO' },
    { id: 2, name: 'Preto', color: '#1a1a1a', code: 'PRETO' },
    { id: 3, name: 'Carvalho', color: '#8B6914', code: 'CARVALHO' },
    { id: 4, name: 'Nogueira', color: '#5C4033', code: 'NOGUEIRA' },
    { id: 5, name: 'Cerejeira', color: '#DEB887', code: 'CEREJEIRA' },
    { id: 6, name: 'Freijó', color: '#C4A35A', code: 'FREIJO' },
    { id: 7, name: 'Branco Neve', color: '#F0F0F0', code: 'BRANCO_NEVE' },
    { id: 8, name: 'Cinza', color: '#808080', code: 'CINZA' },
    { id: 9, name: 'Azul', color: '#4169E1', code: 'AZUL' },
    { id: 10, name: 'Vermelho', color: '#DC143C', code: 'VERMELHO' }
];

document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    renderMaterialsGrid();
    renderPartsTable();
    
    document.getElementById('scrollToOptimizer').addEventListener('click', () => {
        document.getElementById('optimizer').scrollIntoView({ behavior: 'smooth' });
    });
});

function initEventListeners() {
    document.getElementById('addPartBtn').addEventListener('click', addPart);
    document.getElementById('optimizeBtn').addEventListener('click', calculateOptimalCutting);
    
    document.querySelectorAll('.thickness-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.thickness-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    const bladeSlider = document.getElementById('bladeThickness');
    bladeSlider.addEventListener('input', (e) => {
        document.getElementById('bladeValue').textContent = e.target.value + ' mm';
    });
    
    document.getElementById('sheetWidth').addEventListener('change', (e) => {
        state.sheetWidth = parseInt(e.target.value) || 2750;
    });
    document.getElementById('sheetHeight').addEventListener('change', (e) => {
        state.sheetHeight = parseInt(e.target.value) || 1850;
    });
}

function renderMaterialsGrid() {
    const grid = document.querySelector('.materials-list');
    if (!grid) return;
    
    grid.innerHTML = availableMaterials.map(material => `
        <div class="material-item ${state.selectedMaterials.includes(material.code) ? 'selected' : ''}"
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
    const container = document.querySelector('.parts-list-container');
    const countSpan = document.getElementById('partsCount');
    countSpan.textContent = state.parts.length;

    if (state.parts.length === 0) {
        container.innerHTML = `
            <div class="empty-list">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                </svg>
                <p>Nenhuma peça adicionada</p>
                <span>Adicione peças no painel ao lado</span>
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

    showLoading('Processando plano de corte...');

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
        optimizeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Gerar Plano de Corte';
    }, 500);
}

function renderResults() {
    const resultDiv = document.getElementById('resultDisplay');
    const r = state.cuttingResult;
    
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <div class="container">
            <div style="background: var(--bg-elevated); border-radius: 20px; padding: 2rem; margin: 2rem 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                    <h2 style="font-size: 1.5rem;">📐 Resultado da Otimização</h2>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn-primary" onclick="alert('Exportação DXF em breve!')" style="padding: 0.5rem 1rem;">🎨 DXF</button>
                        <button class="btn-primary" onclick="alert('Exportação G-Code em breve!')" style="background: var(--gradient-gold); padding: 0.5rem 1rem;">⚙️ G-Code</button>
                        <button class="btn-primary" onclick="alert('Exportação PDF em breve!')" style="background: var(--gradient-success); padding: 0.5rem 1rem;">📄 PDF</button>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem;">
                    <div style="background: var(--bg-card); padding: 1rem; border-radius: 12px; text-align: center;">
                        <div style="font-size: 2rem; font-weight: 700; color: var(--accent-primary);">${r.totalSheets}</div>
                        <div style="font-size: 0.7rem; color: var(--text-muted);">Chapas</div>
                    </div>
                    <div style="background: var(--bg-card); padding: 1rem; border-radius: 12px; text-align: center;">
                        <div style="font-size: 2rem; font-weight: 700; color: var(--accent-primary);">${r.totalParts}</div>
                        <div style="font-size: 0.7rem; color: var(--text-muted);">Peças</div>
                    </div>
                    <div style="background: var(--bg-card); padding: 1rem; border-radius: 12px; text-align: center;">
                        <div style="font-size: 2rem; font-weight: 700; color: var(--accent-success);">${r.efficiency}%</div>
                        <div style="font-size: 0.7rem; color: var(--text-muted);">Aproveitamento</div>
                    </div>
                    <div style="background: var(--bg-card); padding: 1rem; border-radius: 12px; text-align: center;">
                        <div style="font-size: 2rem; font-weight: 700; color: var(--accent-primary);">${(r.totalAreaUsed/1000000).toFixed(2)}m²</div>
                        <div style="font-size: 0.7rem; color: var(--text-muted);">Área Útil</div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.5rem;">
                    ${r.sheets.map((sheet, idx) => `
                        <div style="background: var(--bg-card); border-radius: 16px; overflow: hidden; border: 1px solid var(--border);">
                            <div style="padding: 1rem; background: linear-gradient(135deg, #1a1a2e, #0f0f1a); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between;">
                                <strong>CHAPA ${sheet.id}</strong>
                                <span style="font-size: 0.75rem; color: var(--accent-primary);">${sheet.material} | ${sheet.utilizationRate}%</span>
                            </div>
                            <div style="padding: 1rem; text-align: center;">
                                <canvas id="sheet-canvas-${idx}" width="350" height="250" style="width: 100%; height: auto; background: #0a0a0f; border-radius: 8px; border: 1px solid var(--border);"></canvas>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    r.sheets.forEach((sheet, idx) => {
        drawTechnicalVisualization(sheet, idx, r.sheetWidth, r.sheetHeight, r.bladeThickness);
    });
    
    document.getElementById('optimizer').scrollIntoView({ behavior: 'smooth' });
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
    
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid
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
    
    // Chapa
    ctx.strokeStyle = '#00b4d8';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, sheetWidth * scale, sheetHeight * scale);
    
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    
    sheet.placements.forEach((part, i) => {
        const x = offsetX + part.x * scale;
        const y = offsetY + part.y * scale;
        const w = part.width * scale;
        const h = part.height * scale;
        
        ctx.fillStyle = colors[i % colors.length] + '40';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = colors[i % colors.length];
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);
        
        ctx.fillStyle = colors[i % colors.length];
        ctx.font = `bold ${Math.min(12, part.height * scale / 5)}px Inter`;
        ctx.fillText(part.name.substring(0, 6), x + 5, y + 15);
        ctx.fillStyle = '#a0a0b0';
        ctx.font = `${Math.min(9, part.height * scale / 6)}px Inter`;
        ctx.fillText(`${part.originalWidth}×${part.originalHeight}`, x + 5, y + 30);
    });
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
