// Dados da aplicação
let state = {
    parts: [],
    selectedMaterials: ['BRANCO', 'PRETO'],
    cuttingResult: null,
    editingPartId: null
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

// Dimensões padrão da chapa
const SHEET_DIMENSIONS = {
    width: 2750,
    height: 1850
};

// Algoritmo de Nesting para CNC
class NestingOptimizer {
    constructor(sheetWidth, sheetHeight, bladeThickness) {
        this.sheetWidth = sheetWidth;
        this.sheetHeight = sheetHeight;
        this.bladeThickness = bladeThickness;
        this.placements = [];
    }

    // Algoritmo de posicionamento Bottom-Left (BLF)
    findBestPosition(part, rotations = true) {
        let bestPosition = null;
        let bestY = Infinity;
        
        // Tentar com e sem rotação
        const orientations = rotations ? [
            { width: part.width, height: part.height, rotated: false },
            { width: part.height, height: part.width, rotated: true }
        ] : [
            { width: part.width, height: part.height, rotated: false }
        ];
        
        for (const orientation of orientations) {
            const w = orientation.width;
            const h = orientation.height;
            
            // Varredura de posições possíveis
            for (let y = 0; y <= this.sheetHeight - h; y += 5) {
                for (let x = 0; x <= this.sheetWidth - w; x += 5) {
                    if (this.isValidPosition(x, y, w, h)) {
                        if (y < bestY) {
                            bestY = y;
                            bestPosition = { x, y, ...orientation };
                        } else if (y === bestY && x < (bestPosition?.x || Infinity)) {
                            bestPosition = { x, y, ...orientation };
                        }
                    }
                }
            }
        }
        
        return bestPosition;
    }
    
    // Verifica se a posição é válida (não colide com outras peças)
    isValidPosition(x, y, width, height) {
        // Verificar bordas da chapa
        if (x < 0 || y < 0 || x + width > this.sheetWidth || y + height > this.sheetHeight) {
            return false;
        }
        
        // Verificar colisão com peças já posicionadas
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
    
    // Adiciona uma peça ao layout
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
    
    // Calcula taxa de aproveitamento
    getUtilizationRate() {
        let usedArea = 0;
        for (const placement of this.placements) {
            usedArea += placement.width * placement.height;
        }
        return (usedArea / (this.sheetWidth * this.sheetHeight)) * 100;
    }
    
    // Gera código G-code para CNC router
    generateGCode() {
        let gcode = [];
        gcode.push('; Plano de Corte para CNC Router');
        gcode.push('; Gerado por Otimizador de Corte MDF');
        gcode.push(`; Data: ${new Date().toLocaleString('pt-BR')}`);
        gcode.push('; Unidades: Milímetros');
        gcode.push('; Espessura da ferramenta: ' + this.bladeThickness + 'mm');
        gcode.push('');
        gcode.push('G90 ; Coordenadas absolutas');
        gcode.push('G21 ; Unidades em mm');
        gcode.push('G17 ; Plano XY');
        gcode.push('M3 ; Ligar spindle');
        gcode.push('G0 Z5 ; Elevar ferramenta');
        gcode.push('');
        
        // Adicionar cada peça como perfil fechado
        for (let i = 0; i < this.placements.length; i++) {
            const p = this.placements[i];
            gcode.push(`; Peça ${i + 1}: ${p.name} (${p.originalWidth}x${p.originalHeight}mm)`);
            gcode.push(`G0 X${p.x.toFixed(2)} Y${p.y.toFixed(2)}`);
            gcode.push('G1 Z-3 F500 ; Profundidade de corte');
            gcode.push(`G1 X${(p.x + p.width).toFixed(2)} Y${p.y.toFixed(2)} F1000`);
            gcode.push(`G1 X${(p.x + p.width).toFixed(2)} Y${(p.y + p.height).toFixed(2)}`);
            gcode.push(`G1 X${p.x.toFixed(2)} Y${(p.y + p.height).toFixed(2)}`);
            gcode.push(`G1 X${p.x.toFixed(2)} Y${p.y.toFixed(2)}`);
            gcode.push('G0 Z5 ; Elevar ferramenta');
            gcode.push('');
        }
        
        gcode.push('M5 ; Desligar spindle');
        gcode.push('G0 X0 Y0 ; Retornar à origem');
        gcode.push('M30 ; Fim do programa');
        
        return gcode.join('\n');
    }
    
    // Gera arquivo DXF otimizado para CNC
    generateDXF() {
        let dxf = [];
        
        // Cabeçalho DXF
        dxf.push('0', 'SECTION', '2', 'HEADER', '0', 'ENDSEC');
        dxf.push('0', 'SECTION', '2', 'TABLES');
        dxf.push('0', 'TABLE', '2', 'LAYER', '70', '6');
        
        // Camadas para CNC
        const layers = [
            { name: '0', color: 7 },
            { name: 'CHAPA', color: 1, lineweight: 0 },
            { name: 'PECAS', color: 3, lineweight: 0 },
            { name: 'PERFURACOES', color: 2, lineweight: 0 },
            { name: 'TEXTO', color: 5, lineweight: 0 },
            { name: 'REFERENCIA', color: 4, lineweight: 0 }
        ];
        
        layers.forEach(layer => {
            dxf.push('0', 'LAYER', '2', layer.name, '70', '0', '62', layer.color.toString(), '6', 'CONTINUOUS');
        });
        
        dxf.push('0', 'ENDTAB', '0', 'ENDSEC');
        dxf.push('0', 'SECTION', '2', 'ENTITIES');
        
        // Moldura da chapa
        dxf.push('0', 'LWPOLYLINE', '8', 'CHAPA', '90', '4', '70', '1');
        dxf.push('10', '0', '20', '0');
        dxf.push('10', this.sheetWidth.toString(), '20', '0');
        dxf.push('10', this.sheetWidth.toString(), '20', this.sheetHeight.toString());
        dxf.push('10', '0', '20', this.sheetHeight.toString());
        
        // Ponto de referência zero
        dxf.push('0', 'POINT', '8', 'REFERENCIA', '10', '0', '20', '0');
        
        // Cada peça como polígono fechado
        for (const p of this.placements) {
            dxf.push('0', 'LWPOLYLINE', '8', 'PECAS', '90', '4', '70', '1');
            dxf.push('10', p.x.toFixed(2), '20', p.y.toFixed(2));
            dxf.push('10', (p.x + p.width).toFixed(2), '20', p.y.toFixed(2));
            dxf.push('10', (p.x + p.width).toFixed(2), '20', (p.y + p.height).toFixed(2));
            dxf.push('10', p.x.toFixed(2), '20', (p.y + p.height).toFixed(2));
            
            // Texto centralizado
            const centerX = p.x + p.width / 2;
            const centerY = p.y + p.height / 2;
            dxf.push('0', 'TEXT', '8', 'TEXTO');
            dxf.push('10', centerX.toFixed(2), '20', centerY.toFixed(2));
            dxf.push('40', Math.min(20, p.height / 3).toString());
            dxf.push('1', `${p.name}\n${p.originalWidth}x${p.originalHeight}`);
            dxf.push('72', '1', '73', '2');
        }
        
        // Adicionar linhas de contorno para corte CNC
        dxf.push('0', 'LTYPE', '2', 'DASHDOT', '70', '64', '3', 'CNC_PATH', '72', '65', '73', '2', '40', '10');
        
        dxf.push('0', 'ENDSEC', '0', 'EOF');
        
        return dxf.join('\n');
    }
}

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', () => {
    renderMaterialsGrid();
    renderPartsTable();
    attachEventListeners();
});

function attachEventListeners() {
    document.getElementById('addPartBtn').addEventListener('click', addPart);
    document.getElementById('optimizeBtn').addEventListener('click', calculateOptimalCutting);
}

function showLoading(message = 'Processando...') {
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-content">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;
    document.body.appendChild(overlay);
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.remove();
}

function renderMaterialsGrid() {
    const grid = document.getElementById('materialsGrid');
    grid.innerHTML = availableMaterials.map(material => `
        <div class="material-card ${state.selectedMaterials.includes(material.code) ? 'selected' : ''}"
             data-material="${material.code}"
             style="background-color: ${material.color}; color: ${material.textColor}"
             onclick="toggleMaterial('${material.code}')">
            <div class="material-preview" style="background-color: ${material.color}"></div>
            <span class="material-name">${material.name}</span>
            ${state.selectedMaterials.includes(material.code) ? '<span class="material-check">✓</span>' : ''}
        </div>
    `).join('');
}

function toggleMaterial(materialCode) {
    if (state.selectedMaterials.includes(materialCode)) {
        state.selectedMaterials = state.selectedMaterials.filter(m => m !== materialCode);
    } else {
        state.selectedMaterials.push(materialCode);
    }
    renderMaterialsGrid();
}

function addPart() {
    const name = document.getElementById('partName').value.trim();
    const width = parseFloat(document.getElementById('partWidth').value);
    const height = parseFloat(document.getElementById('partHeight').value);
    const quantity = parseInt(document.getElementById('partQuantity').value);

    if (!name || isNaN(width) || isNaN(height) || isNaN(quantity) || width <= 0 || height <= 0 || quantity <= 0) {
        alert('Por favor, preencha todos os campos da peça corretamente');
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

function removePart(partId) {
    state.parts = state.parts.filter(part => part.id !== partId);
    if (state.editingPartId === partId) {
        state.editingPartId = null;
    }
    renderPartsTable();
}

function startEditPart(partId) {
    state.editingPartId = partId;
    renderPartsTable();
}

function cancelEdit() {
    state.editingPartId = null;
    renderPartsTable();
}

function saveEdit(partId) {
    const part = state.parts.find(p => p.id === partId);
    if (part) {
        const newName = document.getElementById(`edit_name_${partId}`).value.trim();
        const newWidth = parseFloat(document.getElementById(`edit_width_${partId}`).value);
        const newHeight = parseFloat(document.getElementById(`edit_height_${partId}`).value);

        if (newName && !isNaN(newWidth) && !isNaN(newHeight) && newWidth > 0 && newHeight > 0) {
            part.name = newName;
            part.width = newWidth;
            part.height = newHeight;
            state.editingPartId = null;
            renderPartsTable();
        } else {
            alert('Por favor, insira valores válidos');
        }
    }
}

function renderPartsTable() {
    const container = document.getElementById('partsTable');
    const countSpan = document.getElementById('partsCount');
    countSpan.textContent = state.parts.length;

    if (state.parts.length === 0) {
        container.innerHTML = '<p class="no-parts">Nenhuma peça adicionada ainda. Adicione peças acima para começar.</p>';
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>Largura (mm)</th>
                    <th>Altura (mm)</th>
                    <th>Área (cm²)</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${state.parts.map(part => {
                    if (state.editingPartId === part.id) {
                        return `
                            <tr>
                                <td><input type="text" id="edit_name_${part.id}" value="${escapeHtml(part.name)}" class="edit-input"></td>
                                <td><input type="number" id="edit_width_${part.id}" value="${part.width}" class="edit-input" step="1"></td>
                                <td><input type="number" id="edit_height_${part.id}" value="${part.height}" class="edit-input" step="1"></td>
                                <td>${(part.width * part.height / 100).toFixed(2)}</td>
                                <td>
                                    <button onclick="saveEdit(${part.id})" class="save-edit">💾</button>
                                    <button onclick="cancelEdit()" class="cancel-edit">❌</button>
                                </td>
                            </tr>
                        `;
                    } else {
                        return `
                            <tr>
                                <td>${escapeHtml(part.name)}</td>
                                <td>${part.width}</td>
                                <td>${part.height}</td>
                                <td>${(part.width * part.height / 100).toFixed(2)}</td>
                                <td>
                                    <button onclick="startEditPart(${part.id})" class="edit-part">✏️</button>
                                    <button onclick="removePart(${part.id})" class="remove-part">🗑️</button>
                                </td>
                            </tr>
                        `;
                    }
                }).join('')}
            </tbody>
        </table>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function calculateOptimalCutting() {
    const bladeThickness = parseFloat(document.getElementById('bladeThickness').value);
    const sheetThickness = parseInt(document.getElementById('sheetThickness').value);
    const sheetsCount = parseInt(document.getElementById('sheetsCount').value);

    if (state.parts.length === 0) {
        alert('Adicione pelo menos uma peça para otimizar o corte!');
        return;
    }

    if (state.selectedMaterials.length === 0) {
        alert('Selecione pelo menos um material disponível!');
        return;
    }

    const optimizeBtn = document.getElementById('optimizeBtn');
    optimizeBtn.textContent = '🔄 Otimizando com Nesting...';
    optimizeBtn.disabled = true;

    showLoading('Otimizando layout para CNC Router...');

    setTimeout(() => {
        // Ordenar peças por área decrescente (melhor para nesting)
        const sortedParts = [...state.parts].sort((a, b) => 
            (b.width * b.height) - (a.width * a.height)
        );

        const usedSheets = [];

        for (const part of sortedParts) {
            let placed = false;
            
            // Tentar colocar em chapas existentes
            for (const sheet of usedSheets) {
                const optimizer = sheet.optimizer;
                const position = optimizer.findBestPosition(part, true);
                
                if (position) {
                    optimizer.addPart(part, position);
                    placed = true;
                    break;
                }
            }
            
            // Criar nova chapa se necessário
            if (!placed) {
                const newOptimizer = new NestingOptimizer(
                    SHEET_DIMENSIONS.width,
                    SHEET_DIMENSIONS.height,
                    bladeThickness
                );
                
                const position = newOptimizer.findBestPosition(part, true);
                if (position) {
                    newOptimizer.addPart(part, position);
                    
                    usedSheets.push({
                        id: usedSheets.length + 1,
                        optimizer: newOptimizer,
                        material: state.selectedMaterials[usedSheets.length % state.selectedMaterials.length],
                        sheetThickness: sheetThickness
                    });
                } else {
                    console.warn(`Peça ${part.name} não coube em nenhuma chapa`);
                }
            }
        }

        // Calcular estatísticas
        const totalSheetsNeeded = Math.min(usedSheets.length, sheetsCount);
        const finalSheets = usedSheets.slice(0, sheetsCount);
        
        let totalAreaUsed = 0;
        let totalAreaAvailable = 0;
        
        finalSheets.forEach(sheet => {
            const sheetArea = SHEET_DIMENSIONS.width * SHEET_DIMENSIONS.height;
            const usedArea = sheet.optimizer.placements.reduce((sum, p) => 
                sum + (p.width * p.height), 0
            );
            totalAreaUsed += usedArea;
            totalAreaAvailable += sheetArea;
        });
        
        const totalWaste = totalAreaAvailable - totalAreaUsed;
        const efficiency = ((totalAreaUsed / totalAreaAvailable) * 100).toFixed(2);
        
        // Calcular desperdício por material
        const wasteByMaterial = {};
        finalSheets.forEach(sheet => {
            if (!wasteByMaterial[sheet.material]) {
                wasteByMaterial[sheet.material] = 0;
            }
            const sheetArea = SHEET_DIMENSIONS.width * SHEET_DIMENSIONS.height;
            const usedArea = sheet.optimizer.placements.reduce((sum, p) => 
                sum + (p.width * p.height), 0
            );
            wasteByMaterial[sheet.material] += (sheetArea - usedArea);
        });
        
        state.cuttingResult = {
            sheets: finalSheets.map(sheet => ({
                id: sheet.id,
                material: sheet.material,
                sheetThickness: sheet.sheetThickness,
                placements: sheet.optimizer.placements,
                utilizationRate: sheet.optimizer.getUtilizationRate().toFixed(2),
                gcode: sheet.optimizer.generateGCode(),
                dxf: sheet.optimizer.generateDXF()
            })),
            totalSheetsNeeded: finalSheets.length,
            totalParts: state.parts.length,
            totalAreaUsed,
            totalWaste,
            efficiency,
            wasteByMaterial,
            bladeThickness,
            sheetThickness,
            sheetDimensions: SHEET_DIMENSIONS
        };
        
        hideLoading();
        renderResults();
        
        optimizeBtn.textContent = '⚡ Otimizar Corte';
        optimizeBtn.disabled = false;
    }, 500);
}

function renderResults() {
    const resultDiv = document.getElementById('resultDisplay');
    const result = state.cuttingResult;
    
    if (!result) return;
    
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <div class="result-header">
            <h2>📊 Resultado da Otimização CNC</h2>
            <div class="export-buttons">
                <button onclick="exportToDXF()" class="export-btn dxf">🎨 Exportar DXF</button>
                <button onclick="exportAllGCode()" class="export-btn" style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);">⚙️ Exportar G-Code</button>
                <button onclick="exportToPDF()" class="export-btn pdf">📄 Exportar PDF</button>
                <button onclick="downloadReport()" class="export-btn excel">📥 Baixar JSON</button>
            </div>
        </div>
        
        <div class="summary-stats">
            <div class="stat-card">
                <div class="stat-icon">📋</div>
                <div class="stat-info">
                    <div class="stat-value">${result.totalSheetsNeeded}</div>
                    <div class="stat-label">Chapas Utilizadas</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">🔧</div>
                <div class="stat-info">
                    <div class="stat-value">${result.totalParts}</div>
                    <div class="stat-label">Peças Cortadas</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">📐</div>
                <div class="stat-info">
                    <div class="stat-value">${formatArea(result.totalAreaUsed)}</div>
                    <div class="stat-label">Área Utilizada</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">🗑️</div>
                <div class="stat-info">
                    <div class="stat-value">${formatArea(result.totalWaste)}</div>
                    <div class="stat-label">Desperdício Total</div>
                </div>
            </div>
            
            <div class="stat-card efficiency">
                <div class="stat-icon">⚡</div>
                <div class="stat-info">
                    <div class="stat-value">${result.efficiency}%</div>
                    <div class="stat-label">Eficiência</div>
                </div>
            </div>
        </div>
        
        <div class="sheets-details">
            <h3>📄 Detalhamento das Chapas (Nesting Otimizado)</h3>
            <div class="sheets-grid">
                ${result.sheets.map((sheet, index) => `
                    <div class="sheet-card">
                        <div class="sheet-header">
                            <h4>Chapa #${sheet.id}</h4>
                            <span class="material-badge" style="background-color: ${getMaterialColor(sheet.material)}; color: ${getMaterialTextColor(sheet.material)}">
                                ${sheet.material}
                            </span>
                            <span class="utilization-badge">
                                ${sheet.utilizationRate}% aproveitamento
                            </span>
                        </div>
                        
                        <div class="sheet-info">
                            <div class="info-row"><strong>Espessura:</strong> ${result.sheetThickness} mm</div>
                            <div class="info-row"><strong>Dimensões:</strong> ${result.sheetDimensions.width} x ${result.sheetDimensions.height} mm</div>
                            <div class="info-row"><strong>Peças:</strong> ${sheet.placements.length}</div>
                            <div class="info-row"><strong>Arranjo:</strong> Nesting otimizado para CNC</div>
                        </div>
                        
                        <div class="sheet-parts">
                            <h5>Peças posicionadas (posições aleatórias otimizadas):</h5>
                            <ul>
                                ${sheet.placements.map(part => `
                                    <li>
                                        ${escapeHtml(part.name)} - ${part.originalWidth}×${part.originalHeight}mm
                                        ${part.rotated ? '↻ (rotacionada)' : ''}
                                        <span class="position"> (pos: ${part.x.toFixed(0)},${part.y.toFixed(0)})</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                        
                        <button class="view-sheet-button" onclick="toggleSheetVisualization(${index})">
                            ${window.currentSheetVisualization === index ? 'Ocultar Visualização' : 'Visualizar Layout CNC'}
                        </button>
                        
                        <div id="sheet-viz-${index}" class="sheet-visualization" style="display: ${window.currentSheetVisualization === index ? 'block' : 'none'}">
                            <img id="sheet-img-${index}" class="sheet-canvas" alt="Layout da Chapa ${sheet.id}">
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="cnc-info">
            <h3>🖨️ Informações para CNC Router</h3>
            <div class="info-grid">
                <div class="info-card">
                    <h4>Configurações Recomendadas</h4>
                    <ul>
                        <li>🔪 Ferramenta: Router bit ${result.bladeThickness}mm</li>
                        <li>⚡ Velocidade spindle: 18000 RPM</li>
                        <li>📏 Velocidade corte: 1000 mm/min</li>
                        <li>📐 Profundidade passe: 3mm</li>
                        <li>🔄 Sentido corte: Climb milling</li>
                    </ul>
                </div>
                <div class="info-card">
                    <h4>Dicas de Usinagem</h4>
                    <ul>
                        <li>✅ Verifique fixação da chapa</li>
                        <li>✅ Utilize tabs para evitar soltura</li>
                        <li>✅ Considere folga de ${result.bladeThickness}mm</li>
                        <li>✅ Faça primeiro os furos internos</li>
                        <li>✅ Execute corte externo por último</li>
                    </ul>
                </div>
            </div>
        </div>
        
        <div class="waste-analysis">
            <h3>📉 Análise de Desperdício por Material</h3>
            <div class="waste-grid">
                ${Object.entries(result.wasteByMaterial).map(([material, waste]) => `
                    <div class="waste-card">
                        <div class="waste-material">${material}</div>
                        <div class="waste-area">${formatArea(waste)}</div>
                        <div class="waste-percentage">${((waste / result.totalWaste) * 100).toFixed(1)}% do total</div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="optimization-tips">
            <h4>💡 Dicas de Otimização para CNC</h4>
            <ul>
                <li>🎯 Algoritmo de Nesting inteligente posiciona peças aleatoriamente para máximo aproveitamento</li>
                <li>🔄 Peças podem ser rotacionadas automaticamente para melhor encaixe</li>
                <li>📐 Considere a espessura da ferramenta (${result.bladeThickness}mm) nas operações de corte</li>
                <li>⚡ Eficiência atual de ${result.efficiency}% - ${result.efficiency > 85 ? 'Excelente aproveitamento!' : result.efficiency > 70 ? 'Bom aproveitamento' : 'Tente adicionar peças menores para preenchimento'}</li>
                <li>💾 Exporte G-Code para carregar diretamente na sua CNC</li>
            </ul>
        </div>
    `;
    
    result.sheets.forEach((sheet, index) => {
        drawSheetVisualization(sheet, index);
    });
    
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function drawSheetVisualization(sheet, index) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const scale = 0.5;
    const width = SHEET_DIMENSIONS.width * scale;
    const height = SHEET_DIMENSIONS.height * scale;
    
    canvas.width = width;
    canvas.height = height;
    
    // Fundo
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);
    
    // Desenhar grid de referência
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < width; x += 100) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 0; y < height; y += 100) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Desenhar peças (nesting não linear)
    sheet.placements.forEach(part => {
        ctx.fillStyle = getRandomColor(part.name);
        ctx.fillRect(part.x * scale, part.y * scale, part.width * scale, part.height * scale);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(part.x * scale, part.y * scale, part.width * scale, part.height * scale);
        
        if (part.width * scale > 30 && part.height * scale > 20) {
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${Math.min(12, part.height * scale / 4)}px Arial`;
            ctx.fillText(part.name.substring(0, 6), part.x * scale + 5, part.y * scale + 15);
            
            if (part.rotated) {
                ctx.fillStyle = '#f39c12';
                ctx.font = '10px Arial';
                ctx.fillText('↻', part.x * scale + 5, part.y * scale + 30);
            }
        }
    });
    
    const imgElement = document.getElementById(`sheet-img-${index}`);
    if (imgElement) {
        imgElement.src = canvas.toDataURL();
    }
}

// Funções de Exportação
function exportToDXF() {
    if (!state.cuttingResult) {
        alert('Nenhum resultado para exportar. Execute a otimização primeiro!');
        return;
    }
    
    showLoading('Gerando arquivo DXF para CNC...');
    
    setTimeout(() => {
        let allDXF = [];
        
        state.cuttingResult.sheets.forEach((sheet, idx) => {
            const sheetDXF = generateSheetDXF(sheet, idx);
            allDXF.push(sheetDXF);
        });
        
        const finalDXF = allDXF.join('\n');
        downloadFile(finalDXF, 'plano_corte_cnc.dxf', 'application/dxf');
        hideLoading();
    }, 100);
}

function generateSheetDXF(sheet, sheetIndex) {
    let dxf = [];
    const sheetWidth = SHEET_DIMENSIONS.width;
    const sheetHeight = SHEET_DIMENSIONS.height;
    const offsetX = sheetIndex * (sheetWidth + 100);
    const offsetY = 0;
    
    dxf.push('0', 'SECTION', '2', 'ENTITIES');
    
    // Moldura da chapa
    dxf.push('0', 'LWPOLYLINE', '8', 'CHAPA', '90', '4', '70', '1');
    dxf.push('10', (offsetX).toString(), '20', offsetY.toString());
    dxf.push('10', (offsetX + sheetWidth).toString(), '20', offsetY.toString());
    dxf.push('10', (offsetX + sheetWidth).toString(), '20', (offsetY + sheetHeight).toString());
    dxf.push('10', offsetX.toString(), '20', (offsetY + sheetHeight).toString());
    
    // Texto da chapa
    dxf.push('0', 'TEXT', '8', 'TEXTO');
    dxf.push('10', (offsetX + sheetWidth / 2 - 100).toString(), '20', (offsetY - 30).toString());
    dxf.push('40', '25');
    dxf.push('1', `Chapa ${sheet.id} - ${sheet.material} - ${sheet.utilizationRate}% aproveitamento`);
    
    // Cada peça (posições não lineares)
    sheet.placements.forEach(part => {
        const x = offsetX + part.x;
        const y = offsetY + part.y;
        
        dxf.push('0', 'LWPOLYLINE', '8', 'PECAS', '90', '4', '70', '1');
        dxf.push('10', x.toFixed(2), '20', y.toFixed(2));
        dxf.push('10', (x + part.width).toFixed(2), '20', y.toFixed(2));
        dxf.push('10', (x + part.width).toFixed(2), '20', (y + part.height).toFixed(2));
        dxf.push('10', x.toFixed(2), '20', (y + part.height).toFixed(2));
        
        const centerX = x + part.width / 2;
        const centerY = y + part.height / 2;
        dxf.push('0', 'TEXT', '8', 'TEXTO');
        dxf.push('10', centerX.toFixed(2), '20', centerY.toFixed(2));
        dxf.push('40', Math.min(15, part.height / 4).toString());
        dxf.push('1', `${part.name}\n${part.originalWidth}x${part.originalHeight}`);
        dxf.push('72', '1', '73', '2');
    });
    
    dxf.push('0', 'ENDSEC');
    
    return dxf.join('\n');
}

function exportAllGCode() {
    if (!state.cuttingResult) {
        alert('Nenhum resultado para exportar. Execute a otimização primeiro!');
        return;
    }
    
    showLoading('Gerando G-Code para CNC Router...');
    
    setTimeout(() => {
        let allGCode = [];
        
        allGCode.push('; Programa CNC para Router');
        allGCode.push('; Gerado por Otimizador de Corte MDF');
        allGCode.push(`; Data: ${new Date().toLocaleString('pt-BR')}`);
        allGCode.push(`; Total de chapas: ${state.cuttingResult.sheets.length}`);
        allGCode.push(`; Eficiência: ${state.cuttingResult.efficiency}%`);
        allGCode.push('; ================================================');
        allGCode.push('');
        
        state.cuttingResult.sheets.forEach((sheet, idx) => {
            allGCode.push(`; ========== CHAPA ${sheet.id} ==========`);
            allGCode.push(`; Material: ${sheet.material}`);
            allGCode.push(`; Aproveitamento: ${sheet.utilizationRate}%`);
            allGCode.push(`; ${sheet.placements.length} peças`);
            allGCode.push('');
            
            const optimizer = new NestingOptimizer(SHEET_DIMENSIONS.width, SHEET_DIMENSIONS.height, state.cuttingResult.bladeThickness);
            optimizer.placements = sheet.placements;
            allGCode.push(optimizer.generateGCode());
            allGCode.push('');
        });
        
        downloadFile(allGCode.join('\n'), 'programa_cnc.ngc', 'text/plain');
        hideLoading();
    }, 100);
}

async function exportToPDF() {
    if (!state.cuttingResult) {
        alert('Nenhum resultado para exportar. Execute a otimização primeiro!');
        return;
    }
    
    showLoading('Gerando PDF do plano CNC...');
    
    try {
        const pdfContent = await generatePDFContent();
        
        const opt = {
            margin: [10, 10, 10, 10],
            filename: `plano_cnc_${new Date().toISOString().slice(0,19)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };
        
        const pdfElement = document.createElement('div');
        pdfElement.innerHTML = pdfContent;
        pdfElement.style.position = 'absolute';
        pdfElement.style.left = '-9999px';
        pdfElement.style.top = '-9999px';
        document.body.appendChild(pdfElement);
        
        await html2pdf().set(opt).from(pdfElement).save();
        document.body.removeChild(pdfElement);
        
        hideLoading();
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        hideLoading();
        alert('Erro ao gerar PDF. Tente novamente.');
    }
}

async function generatePDFContent() {
    const result = state.cuttingResult;
    let sheetsHTML = '';
    
    for (let i = 0; i < result.sheets.length; i++) {
        const sheet = result.sheets[i];
        const canvas = await generateSheetCanvasPDF(sheet);
        const imgData = canvas.toDataURL('image/png');
        
        sheetsHTML += `
            <div class="sheet-layout" style="page-break-after: always;">
                <h3>Chapa #${sheet.id} - ${sheet.material}</h3>
                <p><strong>Aproveitamento:</strong> ${sheet.utilizationRate}% | 
                   <strong>Dimensões:</strong> ${SHEET_DIMENSIONS.width} x ${SHEET_DIMENSIONS.height} mm |
                   <strong>Peças:</strong> ${sheet.placements.length}</p>
                <img src="${imgData}" style="width: 100%; max-width: 700px; margin: 20px auto; display: block; border: 1px solid #ccc;" />
                <h4>Lista de Peças (Nesting Otimizado):</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th>Peça</th>
                            <th>Largura (mm)</th>
                            <th>Altura (mm)</th>
                            <th>Área (m²)</th>
                            <th>Posição X</th>
                            <th>Posição Y</th>
                            <th>Rotacionada</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sheet.placements.map(part => `
                            <tr>
                                <td>${escapeHtml(part.name)}</td>
                                <td>${part.originalWidth}</td>
                                <td>${part.originalHeight}</td>
                                <td>${(part.originalWidth * part.originalHeight / 1000000).toFixed(4)}</td>
                                <td>${part.x.toFixed(0)}</td>
                                <td>${part.y.toFixed(0)}</td>
                                <td>${part.rotated ? '✓' : '✗'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Plano CNC - Otimizador MDF</title>
            <style>
                body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 3px solid #3498db;
                    padding-bottom: 20px;
                }
                .summary {
                    margin: 20px 0;
                    padding: 15px;
                    background: #ecf0f1;
                    border-radius: 10px;
                }
                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 15px;
                    margin-top: 15px;
                }
                .summary-item {
                    text-align: center;
                    padding: 10px;
                    background: white;
                    border-radius: 8px;
                }
                .summary-value {
                    font-size: 24px;
                    font-weight: bold;
                    color: #2c3e50;
                }
                .summary-label {
                    font-size: 12px;
                    color: #7f8c8d;
                    margin-top: 5px;
                }
                .sheet-layout {
                    margin: 30px 0;
                    page-break-inside: avoid;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                    font-size: 11px;
                }
                th, td {
                    border: 1px solid #bdc3c7;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background: #3498db;
                    color: white;
                }
                .footer {
                    text-align: center;
                    margin-top: 50px;
                    padding-top: 20px;
                    border-top: 1px solid #bdc3c7;
                    font-size: 10px;
                    color: #7f8c8d;
                }
                h3 {
                    color: #2c3e50;
                    margin-top: 30px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🖨️ Plano de Corte para CNC Router</h1>
                <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                <p><strong>Tipo de arranjo:</strong> Nesting otimizado (posicionamento não linear)</p>
            </div>
            
            <div class="summary">
                <h3>Resumo da Otimização CNC</h3>
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="summary-value">${result.totalSheetsNeeded}</div>
                        <div class="summary-label">Chapas Utilizadas</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${result.totalParts}</div>
                        <div class="summary-label">Peças Cortadas</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${result.efficiency}%</div>
                        <div class="summary-label">Eficiência</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${result.bladeThickness}mm</div>
                        <div class="summary-label">Ferramenta</div>
                    </div>
                </div>
            </div>
            
            ${sheetsHTML}
            
            <div class="footer">
                <p>Documento gerado automaticamente pelo Otimizador de Corte para CNC Router</p>
                <p>Arranjo não linear otimizado para máximo aproveitamento da chapa</p>
                <p>Dimensões em milímetros (mm) | Verificar folgas da ferramenta antes da usinagem</p>
            </div>
        </body>
        </html>
    `;
}

function generateSheetCanvasPDF(sheet) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const scale = 0.6;
        const width = SHEET_DIMENSIONS.width * scale;
        const height = SHEET_DIMENSIONS.height * scale;
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, width, height);
        
        sheet.placements.forEach(part => {
            ctx.fillStyle = getRandomColor(part.name);
            ctx.fillRect(part.x * scale, part.y * scale, part.width * scale, part.height * scale);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(part.x * scale, part.y * scale, part.width * scale, part.height * scale);
            
            if (part.width * scale > 40 && part.height * scale > 30) {
                ctx.fillStyle = '#000';
                ctx.font = `bold ${Math.min(14, part.height * scale / 4)}px Arial`;
                ctx.fillText(part.name, part.x * scale + 5, part.y * scale + 20);
                ctx.font = `${Math.min(11, part.height * scale / 5)}px Arial`;
                ctx.fillText(`${part.originalWidth}×${part.originalHeight}`, part.x * scale + 5, part.y * scale + 40);
            }
        });
        
        resolve(canvas);
    });
}

function getRandomColor(seed) {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7D794'];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash % colors.length)];
}

function getMaterialColor(materialCode) {
    const material = availableMaterials.find(m => m.code === materialCode);
    return material ? material.color : '#CCCCCC';
}

function getMaterialTextColor(materialCode) {
    const material = availableMaterials.find(m => m.code === materialCode);
    return material ? material.textColor : '#333';
}

function formatArea(area) {
    return `${(area / 10000).toFixed(2)} m²`;
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function downloadReport() {
    const result = state.cuttingResult;
    if (!result) return;
    
    const report = {
        date: new Date().toISOString(),
        machineType: 'CNC Router',
        nestingType: 'Otimizado (posicionamento não linear)',
        summary: {
            totalSheetsNeeded: result.totalSheetsNeeded,
            totalParts: result.totalParts,
            totalAreaUsed: formatArea(result.totalAreaUsed),
            totalWaste: formatArea(result.totalWaste),
            efficiency: `${result.efficiency}%`,
            bladeThickness: result.bladeThickness,
            sheetThickness: result.sheetThickness,
            sheetDimensions: result.sheetDimensions
        },
        sheets: result.sheets.map(sheet => ({
            sheetId: sheet.id,
            material: sheet.material,
            utilizationRate: sheet.utilizationRate,
            placements: sheet.placements.map(part => ({
                name: part.name,
                width: part.originalWidth,
                height: part.originalHeight,
                position: { x: part.x, y: part.y },
                rotated: part.rotated
            }))
        })),
        wasteByMaterial: result.wasteByMaterial
    };
    
    const dataStr = JSON.stringify(report, null, 2);
    downloadFile(dataStr, `relatorio_cnc_${new Date().toISOString().slice(0,19)}.json`, 'application/json');
}

// Variáveis globais
window.currentSheetVisualization = null;

// Tornar funções globais
window.toggleMaterial = toggleMaterial;
window.removePart = removePart;
window.startEditPart = startEditPart;
window.cancelEdit = cancelEdit;
window.saveEdit = saveEdit;
window.downloadReport = downloadReport;
window.toggleSheetVisualization = toggleSheetVisualization;
window.exportToDXF = exportToDXF;
window.exportAllGCode = exportAllGCode;
window.exportToPDF = exportToPDF;