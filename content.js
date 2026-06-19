// --- content.js ---
// This script runs automatically when you visit an FMX equipment page.

function injectPrintButton() {
    // 1. Check if the wrapper already exists so we don't add duplicates
    if (document.getElementById('wfs-dymo-wrapper')) return;

    // 2. Create a wrapper to hold the drag handle, main button, dropdown, and toggle button
    const wrapper = document.createElement('div');
    wrapper.id = 'wfs-dymo-wrapper';
    
    // Position the wrapper. It defaults to bottom right, but will update if moved.
    wrapper.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: sans-serif;
        background: rgba(255, 255, 255, 0.85);
        padding: 6px 8px;
        border-radius: 50px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        border: 1px solid #e5e7eb;
        backdrop-filter: blur(4px);
    `;

    // 3. Create the drag handle
    const dragHandle = document.createElement('div');
    dragHandle.innerHTML = '⋮⋮';
    dragHandle.title = 'Drag to move';
    dragHandle.style.cssText = `
        cursor: grab;
        color: #9ca3af;
        font-size: 18px;
        font-weight: bold;
        padding: 0 4px;
        user-select: none;
        display: flex;
        align-items: center;
    `;

    // --- Drag Logic ---
    let isDragging = false;
    let startX, startY, initialTop, initialLeft;

    const savedTop = localStorage.getItem('wfs-dymo-pos-top');
    const savedLeft = localStorage.getItem('wfs-dymo-pos-left');
    if (savedTop && savedLeft) {
        wrapper.style.bottom = 'auto'; 
        wrapper.style.right = 'auto';
        wrapper.style.top = savedTop;
        wrapper.style.left = savedLeft;
    }

    dragHandle.onmousedown = (e) => {
        isDragging = true;
        dragHandle.style.cursor = 'grabbing';
        startX = e.clientX;
        startY = e.clientY;
        const rect = wrapper.getBoundingClientRect();
        initialTop = rect.top;
        initialLeft = rect.left;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault(); 
    };

    function onMouseMove(e) {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        wrapper.style.bottom = 'auto';
        wrapper.style.right = 'auto';
        wrapper.style.top = (initialTop + dy) + 'px';
        wrapper.style.left = (initialLeft + dx) + 'px';
    }

    function onMouseUp() {
        if (!isDragging) return;
        isDragging = false;
        dragHandle.style.cursor = 'grab';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        localStorage.setItem('wfs-dymo-pos-top', wrapper.style.top);
        localStorage.setItem('wfs-dymo-pos-left', wrapper.style.left);
    }

    // 4. Create the Label Type Dropdown
    const typeSelect = document.createElement('select');
    typeSelect.id = 'wfs-dymo-type-select';
    typeSelect.innerHTML = `
        <option value="student">Student</option>
        <option value="staff">Staff</option>
        <option value="student_ipad">Student iPad</option>
        <option value="staff_ipad">Staff iPad</option>
        <option value="bulk_student">Bulk (By Class/Grad Year)</option>
        <option value="bulk_summer">Bulk (Custom)</option>
    `;
    typeSelect.style.cssText = `
        padding: 0 16px;
        height: 40px;
        border-radius: 50px;
        border: 1px solid #d1d5db;
        font-size: 15px;
        font-weight: 600;
        font-family: sans-serif;
        background-color: #f9fafb;
        color: #374151;
        cursor: pointer;
        outline: none;
        box-sizing: border-box;
    `;

    // Load saved preference for the dropdown
    const savedType = localStorage.getItem('wfs-dymo-label-type');
    if (savedType) {
        typeSelect.value = savedType;
    }

    typeSelect.onchange = (e) => {
        localStorage.setItem('wfs-dymo-label-type', e.target.value);
    };

    // 5. Create the main "Print" button
    const btn = document.createElement('button');
    btn.id = 'wfs-dymo-print-btn';
    btn.innerHTML = '🖨️ Print Dymo Label';
    btn.style.cssText = `
        background-color: #2563eb;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 50px;
        font-size: 15px;
        font-weight: bold;
        font-family: sans-serif;
        cursor: pointer;
        transition: transform 0.1s, background-color 0.2s;
        white-space: nowrap;
    `;
    
    btn.onmouseover = () => btn.style.backgroundColor = '#1d4ed8';
    btn.onmouseout = () => btn.style.backgroundColor = '#2563eb';
    btn.onmousedown = () => btn.style.transform = 'scale(0.95)';
    btn.onmouseup = () => btn.style.transform = 'scale(1)';

    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'wfs-dymo-toggle-btn';
    toggleBtn.style.cssText = `
        background-color: #6b7280;
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        justify-content: center;
        align-items: center;
    `;

    let isHidden = localStorage.getItem('wfs-dymo-btn-hidden') === 'true';

    function updateUI() {
        if (isHidden) {
            btn.style.display = 'none'; 
            typeSelect.style.display = 'none';
            toggleBtn.innerHTML = '🖨️';
            toggleBtn.style.width = '40px';
            toggleBtn.style.height = '40px';
            toggleBtn.style.fontSize = '18px';
        } else {
            btn.style.display = 'block'; 
            typeSelect.style.display = 'block';
            toggleBtn.innerHTML = '✖';
            toggleBtn.style.width = '28px';
            toggleBtn.style.height = '28px';
            toggleBtn.style.fontSize = '12px';
        }
        localStorage.setItem('wfs-dymo-btn-hidden', isHidden);
    }

    toggleBtn.onclick = () => {
        isHidden = !isHidden;
        updateUI();
    };

    updateUI();

    btn.onclick = () => {
        const originalText = btn.innerHTML;

        // --- BULK EXTRACTION LOGIC (Shared between Student & Summer) ---
        function extractFmxData() {
            let rawRows = Array.from(document.querySelectorAll('tr.grid__row[data-bulk-action-row-id]'));
            const checkedRowIds = Array.from(document.querySelectorAll('input[type="checkbox"].grid__select-row-toggle:checked'))
                .map(cb => {
                    const tr = cb.closest('tr[data-bulk-action-row-id]');
                    return tr ? tr.getAttribute('data-bulk-action-row-id') : null;
                })
                .filter(id => id !== null);

            if (checkedRowIds.length > 0) {
                rawRows = rawRows.filter(row => checkedRowIds.includes(row.getAttribute('data-bulk-action-row-id')));
            }

            let extractedItems = [];

            rawRows.forEach(row => {
                let fmxId = row.getAttribute('data-bulk-action-row-id');
                if (!fmxId) return;

                let itemData = {
                    fmxId: fmxId,
                    serial: '',
                    tag: '',
                    name: 'Name Missing',
                    grad: 'YYYY',
                    model: 'YYYY'
                };

                const dl = row.querySelector('dl.dl-horizontal');
                if (dl) {
                    const dts = dl.querySelectorAll('dt');
                    dts.forEach(dt => {
                        const key = dt.textContent.trim().toLowerCase();
                        const dd = dt.nextElementSibling;
                        const val = dd ? dd.textContent.replace(/\s+/g, ' ').trim() : '';

                        if (key.includes('serial number')) itemData.serial = val;
                        if (key === 'tag' || key.includes('tag')) itemData.tag = val;
                        if (key.includes('full label name')) itemData.name = val;
                        if (key.includes('graduation year')) itemData.grad = val;
                        if (key.includes('model year')) itemData.model = val;
                    });
                }

                if (!itemData.serial || itemData.serial === '-') {
                    const tagStr = itemData.tag || row.textContent;
                    const match = tagStr.match(/\b\d{4,}\s*[-–—]\s*([A-Za-z0-9-]+)\b/);
                    if (match) itemData.serial = match[1].trim();
                    else itemData.serial = "TAG";
                }

                extractedItems.push(itemData);
            });

            return extractedItems;
        }

        // --- BULK (STUDENT) PRINT LOGIC ---
        if (typeSelect.value === 'bulk_student') {
            const itemsToPrint = extractFmxData();

            if (itemsToPrint.length === 0) {
                alert("No equipment tags found on this page. Make sure you are on a list view with Tag columns.");
                return;
            }

            btn.innerHTML = `⏳ Generating ${itemsToPrint.length} labels...`;

            const labelsData = itemsToPrint.map((item) => {
                const urlStr = window.location.origin + '/equipment/' + item.fmxId + '/details';
                const subtitleText = `Grade ${item.grad} - Model ${item.model}`;

                return {
                    labelName: item.name,
                    subtitle: subtitleText,
                    tagNumber: item.serial,
                    url: urlStr
                };
            });

            printLabels(labelsData, () => {
                btn.innerHTML = originalText;
            });

            return;
        }

        // --- BULK (SUMMER) PRINT LOGIC ---
        else if (typeSelect.value === 'bulk_summer') {
            const nameOption = prompt(
                "Full Label Name Option:\n" +
                "Type '1' to use the FMX 'Full Label Name' column data.\n" +
                "Type '2' to enter a custom base name with a counter.", 
                "1"
            );
            if (!nameOption) return;

            let customName = "";
            let isSequential = true;
            let specificNumbers = [];
            let startNum = 1;

            if (nameOption.trim() === '2') {
                customName = prompt("Enter Full Label Name Base (e.g., WSD-Summer CB):", "Summer Device");
                if (!customName) return; 
            }

            // 1. Column detection to grab model year and optionally full label name
            let cols = { serial: -1, name: -1, model: -1 };
            const headers = document.querySelectorAll('thead th');
            if (headers.length > 0) {
                headers.forEach((th, idx) => {
                    const text = th.textContent.trim().toLowerCase();
                    const html = th.innerHTML.toLowerCase();
                    if (text.includes('serial number - technolog') || html.includes('serial number - technology') || text.includes('serial number')) cols.serial = idx;
                    if (text.includes('full label name') || html.includes('full label name')) cols.name = idx;
                    if (text.includes('model year') || html.includes('model year')) cols.model = idx;
                });
            } else {
                document.querySelectorAll('tr').forEach(tr => {
                    if (cols.serial !== -1 && cols.name !== -1 && cols.model !== -1) return;
                    Array.from(tr.children).forEach((cell, idx) => {
                        const text = cell.textContent.trim().toLowerCase();
                        if (text.includes('serial number - technolog') || text.includes('serial number')) cols.serial = idx;
                        if (text.includes('full label name')) cols.name = idx;
                        if (text.includes('model year')) cols.model = idx;
                    });
                });
            }

            // 2. Gather rows
            let rawRows = Array.from(document.querySelectorAll('tr.grid__row[data-bulk-action-row-id]'));
            const checkedBoxes = Array.from(document.querySelectorAll('input[type="checkbox"].grid__select-row-toggle:checked'));
            
            if (checkedBoxes.length > 0) {
                const checkedIds = checkedBoxes.map(cb => {
                    const tr = cb.closest('tr[data-bulk-action-row-id]');
                    return tr ? tr.getAttribute('data-bulk-action-row-id') : null;
                }).filter(id => id !== null);
                rawRows = rawRows.filter(row => checkedIds.includes(row.getAttribute('data-bulk-action-row-id')));
            }

            // 3. Deduplicate
            const uniqueItemsMap = new Map();
            rawRows.forEach(row => {
                let fmxId = row.getAttribute('data-bulk-action-row-id');
                if (!fmxId) {
                    const link = row.querySelector('a[href*="/equipment/"]');
                    if (link) {
                        const match = link.href.match(/\/equipment\/(\d+)/i);
                        if (match) fmxId = match[1];
                    }
                }
                if (fmxId && !uniqueItemsMap.has(fmxId)) {
                    uniqueItemsMap.set(fmxId, row);
                }
            });

            const itemsToPrint = Array.from(uniqueItemsMap.entries());

            if (itemsToPrint.length === 0) {
                alert("No equipment tags found on this page. Make sure you are on a list view with Tag columns.");
                return;
            }

            if (nameOption.trim() === '2') {
                const numberInput = prompt(
                    `Found ${itemsToPrint.length} items to print.\n\n` +
                    `HOW TO NUMBER THEM:\n` +
                    `• Sequential: Enter a starting number (e.g., "1" or "21").\n` +
                    `• Specific: Enter comma-separated numbers (e.g., "4, 5, 17").`, 
                    "1"
                );
                if (!numberInput) return;

                isSequential = !numberInput.includes(',');
                if (isSequential) {
                    startNum = parseInt(numberInput.trim(), 10) || 1;
                } else {
                    specificNumbers = numberInput.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
                    if (specificNumbers.length !== itemsToPrint.length) {
                        alert(`Error: You provided ${specificNumbers.length} specific numbers, but there are ${itemsToPrint.length} items queued to print. They must match exactly!`);
                        return;
                    }
                }
            }

            btn.innerHTML = `⏳ Generating ${itemsToPrint.length} labels...`;

            const labelsData = itemsToPrint.map(([fmxId, row], index) => {
                const urlStr = window.location.origin + '/equipment/' + fmxId + '/details';

                const getCellText = (idx) => {
                    if (idx !== -1 && row.children[idx]) {
                        return row.children[idx].textContent.replace(/\s+/g, ' ').trim();
                    }
                    return null;
                };

                let tagNumber = getCellText(cols.serial);
                
                if (!tagNumber || tagNumber === '-' || tagNumber.toLowerCase() === 'none') {
                    const tagLink = row.querySelector('td.grid__cell a[href*="/equipment/"]');
                    if (tagLink) {
                        const text = tagLink.textContent.trim();
                        const dashIdx = text.indexOf('-');
                        tagNumber = dashIdx !== -1 ? text.substring(dashIdx + 1).trim() : text;
                    } else {
                        tagNumber = "TAG";
                    }
                }

                const extractedModel = getCellText(cols.model) || 'YYYY';
                const subtitleText = `Summer - Model ${extractedModel}`;

                let finalLabelName = "Name Missing";
                if (nameOption.trim() === '2') {
                    const currentNum = isSequential ? (startNum + index) : specificNumbers[index];
                    const paddedIndex = String(currentNum).padStart(2, '0');
                    const cleanName = customName.replace(/-+$/, '').trim();
                    finalLabelName = `${cleanName}-${paddedIndex}`;
                } else {
                    finalLabelName = getCellText(cols.name) || "Name Missing";
                }

                return {
                    labelName: finalLabelName,
                    subtitle: subtitleText,
                    tagNumber: tagNumber,
                    url: urlStr
                };
            });

            printLabels(labelsData, () => {
                btn.innerHTML = originalText;
            });

            return;
        }

        // --- SINGLE PRINT LOGIC ---
        btn.innerHTML = '⏳ Generating...';
        
        // Helper to find data on the details page securely
        function getFieldValue(keywords) {
            function matchKw(text) {
                const cleanText = text.trim().toLowerCase();
                return keywords.some(kw => {
                    return cleanText === kw || cleanText.startsWith(kw + ':') || cleanText.startsWith(kw + ' ');
                });
            }

            // 1. Try standard FMX <dt> / <dd> definition lists
            const dts = Array.from(document.querySelectorAll('dt'));
            for (let dt of dts) {
                if (matchKw(dt.textContent)) {
                    let dd = dt.nextElementSibling;
                    if (dd && dd.tagName === 'DD') {
                        const val = dd.textContent.replace(/\s+/g, ' ').trim();
                        if (val && val !== '-' && val.toLowerCase() !== 'none') return val;
                    }
                }
            }

            // 2. Try standard FMX field blocks (labels and values)
            const labels = Array.from(document.querySelectorAll('.control-label, label, th, td.label-cell, .field-label'));
            for (let lbl of labels) {
                if (matchKw(lbl.textContent)) {
                    let sibling = lbl.nextElementSibling;
                    if (sibling) {
                        const val = sibling.textContent.replace(/\s+/g, ' ').trim();
                        if (val && val !== '-' && val.toLowerCase() !== 'none') return val;
                    }
                }
            }

            // 3. Fallback to Regex on page text
            const textContent = document.body.innerText;
            for (let kw of keywords) {
                const safeKw = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const regex = new RegExp('^\\s*' + safeKw + '(?:\\s*:\\s*|\\s*[\\r\\n]+\\s*)([^\\r\\n]+)', 'im');
                const match = textContent.match(regex);
                if (match && match[1]) {
                    const val = match[1].trim();
                    if (val && val !== '-' && val.toLowerCase() !== 'none') return val;
                }
            }

            return '';
        }

        const nameVal = getFieldValue(['full label name']) || 'Name Missing';
        const gradVal = getFieldValue(['graduation year']) || 'YYYY';
        const modelVal = getFieldValue(['model year']) || 'YYYY';
        const ipadGenVal = getFieldValue(['ipad generation']) || 'Unknown';
        
        let serialVal = getFieldValue(['serial number - technology', 'serial number']);
        let tagVal = getFieldValue(['tag']);

        let subtitleText = `Grade ${gradVal} - Model ${modelVal}`; 
        
        if (typeSelect.value === 'staff') {
            subtitleText = `Staff - Model ${modelVal}`;
        } else if (typeSelect.value === 'student_ipad') {
            subtitleText = `Grade ${gradVal} - Model ${ipadGenVal}`;
        } else if (typeSelect.value === 'staff_ipad') {
            subtitleText = `Staff - Model ${ipadGenVal}`;
        }

        let urlObj = new URL(window.location.href);
        if (!urlObj.pathname.endsWith('/details')) {
            urlObj.pathname = urlObj.pathname.replace(/\/$/, '') + '/details';
        }

        let extractedTag = 'TAG';
        if (serialVal) {
            extractedTag = serialVal;
        } else if (tagVal) {
            const fmxIdMatch = tagVal.match(/^\d{4,}\s*[-–—]\s*(.+)$/);
            if (fmxIdMatch) {
                extractedTag = fmxIdMatch[1].trim();
            } else {
                extractedTag = tagVal;
            }
        } else {
            // Ultimate fallback for Details page: Header title (e.g. "1546457 - DSBZ943")
            const headerTitle = document.querySelector('.header__title');
            if (headerTitle) {
                const titleText = headerTitle.textContent.replace(/\s+/g, ' ').trim();
                const titleMatch = titleText.match(/^\d{4,}\s*[-–—]\s*(.+)$/);
                if (titleMatch) {
                    extractedTag = titleMatch[1].trim();
                } else if (titleText && titleText !== 'Equipment') {
                    extractedTag = titleText;
                }
            }
        }

        const singleLabelData = {
            labelName: nameVal,
            subtitle: subtitleText,
            tagNumber: extractedTag,
            url: urlObj.toString()
        };

        printLabels([singleLabelData], () => {
            btn.innerHTML = originalText;
        });
    };

    wrapper.appendChild(dragHandle);
    wrapper.appendChild(typeSelect); 
    wrapper.appendChild(btn);
    wrapper.appendChild(toggleBtn);
    document.body.appendChild(wrapper);
}

function printLabels(dataArray, callback) {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed; right:0; bottom:0; width:3.5in; height:1.125in; border:0; z-index:-1; visibility:hidden;';
    document.body.appendChild(iframe);

    const fontUrl = chrome.runtime.getURL('fonts/ChironGoRoundTC-Medium.ttf'); 

    const qrColWidthIn = 0.8;
    const paddingHIn = 0.15;
    const gapPx = 10;
    
    const totalWidthPx = 3.5 * 96;
    const qrColPx = qrColWidthIn * 96;
    const paddingPx = paddingHIn * 96;
    const maxTextWidthPx = totalWidthPx - (paddingPx * 2) - qrColPx - gapPx;

    let labelsHtml = '';
    dataArray.forEach((data, index) => {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.url)}&margin=0`;
        labelsHtml += `
            <div class="label-page">
                <div class="printable-label-grid">
                    <div class="text-section">
                        <div class="label-name-wrapper">
                            <span class="label-name" id="label-name-el-${index}">${data.labelName}</span>
                        </div>
                        <div class="model-info-wrapper">
                            <span class="model-info" id="model-info-el-${index}">${data.subtitle}</span>
                        </div>
                    </div>
                    <div class="qr-section">
                        <img class="qr-image" src="${qrUrl}" />
                        <span class="tag-number" id="tag-number-el-${index}">${data.tagNumber}</span>
                    </div>
                </div>
            </div>
        `;
    });

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @font-face {
                    font-family: 'ChironGoRoundTC';
                    src: url('${fontUrl}') format('truetype');
                    font-weight: normal;
                    font-style: normal;
                }

                @page { margin: 0; size: 3.5in 1.125in; }
                
                html, body { 
                    margin: 0; 
                    padding: 0; 
                    width: 3.5in;
                    font-family: 'ChironGoRoundTC', Arial, sans-serif; 
                    background: white; 
                    color: black;
                }

                .label-page {
                    page-break-after: always;
                    width: 3.5in;
                    height: 1.125in;
                    overflow: hidden;
                    display: block;
                }
                
                .label-page:last-child {
                    page-break-after: auto;
                }

                .printable-label-grid {
                    display: grid;
                    grid-template-columns: 1fr ${qrColWidthIn}in;
                    gap: ${gapPx}px;
                    align-items: center;
                    width: 3.5in; 
                    height: 1.125in;
                    box-sizing: border-box;
                    padding: 0 ${paddingHIn}in; 
                }
                
                .text-section {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                    overflow: hidden;
                    width: 100%;
                }
                
                .label-name-wrapper {
                    width: 100%;
                    overflow: hidden;
                    text-align: center;
                }

                .label-name { 
                    font-size: 34px; 
                    font-weight: bold; 
                    line-height: 1.1;
                    white-space: nowrap;
                    display: inline-block;
                }
                
                .model-info-wrapper {
                    width: 100%;
                    overflow: hidden;
                    text-align: center;
                }

                .model-info { 
                    font-size: 14px; 
                    font-weight: bold; 
                    margin-top: 10px;
                    white-space: nowrap;
                    display: inline-block;
                    color: #333;
                }
                
                .qr-section {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: ${qrColWidthIn}in;
                    overflow: hidden;
                }
                
                .qr-image { 
                    width: 0.65in; 
                    height: 0.65in; 
                    display: block;
                }
                
                .tag-number { 
                    font-size: 12px; 
                    font-weight: bold; 
                    margin-top: 2px; 
                    text-transform: uppercase;
                    white-space: nowrap;
                    display: inline-block;
                }
            </style>
        </head>
        <body>
            ${labelsHtml}

            <script>
                let isPrinting = false;

                function scaleToFit(elementId, maxWidth, initialSize) {
                    const el = document.getElementById(elementId);
                    if (!el) return;
                    let size = initialSize;
                    el.style.fontSize = size + 'px';
                    while (el.offsetWidth > maxWidth && size > 6) {
                        size -= 0.5;
                        el.style.fontSize = size + 'px';
                    }
                }

                function adjustAll() {
                    const textColWidth = ${maxTextWidthPx};
                    const qrColWidth = ${qrColPx};
                    const totalLabels = ${dataArray.length};

                    for(let i = 0; i < totalLabels; i++) {
                        scaleToFit('label-name-el-' + i, textColWidth - 8, 36);
                        scaleToFit('model-info-el-' + i, textColWidth - 8, 16);
                        scaleToFit('tag-number-el-' + i, qrColWidth - 8, 12);
                    }
                }

                function triggerPrint() {
                    if (isPrinting) return;
                    isPrinting = true;
                    adjustAll();
                    window.print();
                }

                adjustAll();
                
                let loadedCount = 0;
                const totalImages = ${dataArray.length};
                const images = document.querySelectorAll('.qr-image');
                
                if (images.length === 0) {
                    triggerPrint();
                } else {
                    images.forEach(img => {
                        if (img.complete) {
                            loadedCount++;
                            if (loadedCount >= totalImages) triggerPrint();
                        } else {
                            img.onload = () => {
                                loadedCount++;
                                if (loadedCount >= totalImages) triggerPrint();
                            };
                            img.onerror = () => {
                                loadedCount++;
                                if (loadedCount >= totalImages) triggerPrint();
                            };
                        }
                    });
                }
                
                setTimeout(() => {
                    if (!isPrinting) triggerPrint();
                }, 2500);
            </script>
        </body>
        </html>
    `;

    iframe.srcdoc = htmlContent;

    iframe.contentWindow.onafterprint = () => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
        if (callback) callback();
    };

    setTimeout(() => {
        if (document.body.contains(iframe)) {
            if (callback) callback();
        }
    }, 10000);
}

setInterval(injectPrintButton, 2000);