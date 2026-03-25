import { app } from "../../scripts/app.js";

const style = document.createElement("style");
style.innerHTML = `
    .pp-node-ui {
        background: #1C1C1E; padding: 14px; border-radius: 12px; 
        color: #F5F5F7; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
        font-size: 13px; display: flex; flex-direction: column; gap: 10px;
        box-sizing: border-box; width: 100%; height: 100%;
        overflow-y: auto; overflow-x: hidden;
    }
    .pp-node-ui::-webkit-scrollbar { width: 6px; }
    .pp-node-ui::-webkit-scrollbar-thumb { background: #555; border-radius: 3px; }
    
    /* 修复文字溢出重叠：增加最大高度，开启垂直滚动，阻止压缩 */
    .pp-preview-box {
        background: #000000; border-radius: 10px; padding: 15px; font-size: 14px; line-height: 1.6;
        min-height: 60px; max-height: 150px; overflow-y: auto; word-wrap: break-word; 
        border: 1px solid #333; margin-bottom: 2px; flex-shrink: 0;
    }
    .pp-preview-box::-webkit-scrollbar { width: 4px; }
    .pp-preview-box::-webkit-scrollbar-thumb { background: #666; border-radius: 2px; }

    .pp-legend { display: flex; gap: 12px; font-size: 11px; color: #8E8E93; margin-bottom: 5px; margin-left: 5px; font-weight: 500; flex-shrink: 0;}
    .pp-legend span::before { content: '■ '; font-size: 12px;}
    .pp-leg-norm::before { color: #FFFFFF; }
    .pp-leg-del::before { color: #636366; }
    .pp-leg-mod::before { color: #FFD60A; }
    .pp-leg-add::before { color: #0A84FF; }
    
    .pp-tag-normal { color: #FFFFFF; }
    .pp-tag-deleted { color: #636366; text-decoration: line-through; }
    .pp-tag-modified { color: #FFD60A; }
    .pp-tag-added { color: #0A84FF; font-weight: 500;}

    .pp-top { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid #38383A; flex-shrink: 0;}
    
    .pp-toggles { display: flex; flex-wrap: wrap; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid #38383A; flex-shrink: 0;}
    .pp-toggle-btn { padding: 5px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; border: 1px solid transparent; transition: 0.2s; font-weight: 500; }
    .pp-toggle-on { background: #0A84FF; color: #FFF; }
    .pp-toggle-on:hover { background: #007AFF; }
    .pp-toggle-off { background: #2C2C2E; color: #98989D; border-color: #38383A; }
    .pp-toggle-off:hover { background: #3A3A3C; color: #D1D1D6; }

    .pp-rule { background: #2C2C2E; border: 1px solid #38383A; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px; flex-shrink: 0;}
    .pp-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    
    .pp-btn { background: #3A3A3C; color: #FFF; border: none; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; transition: 0.15s;}
    .pp-btn:hover { background: #48484A; }
    .pp-btn-add { background: #32D74B; color: #000; }
    .pp-btn-add:hover { background: #28CD41; }
    .pp-btn-del { background: transparent; color: #FF453A; border: 1px solid #FF453A; padding: 4px 8px;}
    .pp-btn-del:hover { background: #FF453A; color: #FFF; }
    
    .pp-input, .pp-select { background: #1C1C1E; color: #FFF; border: 1px solid #38383A; padding: 5px 8px; border-radius: 6px; font-size: 12px; outline: none; transition: 0.2s; font-family: inherit;}
    .pp-input:focus, .pp-select:focus { border-color: #0A84FF; box-shadow: 0 0 0 2px rgba(10,132,255,0.2); }
    
    .pp-word { display: flex; align-items: center; background: #1C1C1E; border: 1px solid #38383A; border-radius: 6px; overflow: hidden; }
    .pp-word input { border: none; background: transparent; color: #FFF; width: 60px; padding: 5px 8px; font-size: 12px; outline: none; }
    .pp-word button { background: transparent; border: none; border-left: 1px solid #38383A; color: #8E8E93; cursor: pointer; padding: 5px 8px; }
    .pp-word button:hover { background: #FF453A; color: #FFF; }
`;
document.head.appendChild(style);

app.registerExtension({
    name: "Comfy.PromptProcessor",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "PromptProcessorNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);

                // 【核心修复】：彻底抹除额外的输入连线点
                const removeExtraInputs = () => {
                    if (!this.inputs) return;
                    for (let i = this.inputs.length - 1; i >= 0; i--) {
                        if (this.inputs[i].name === "rules_json" || this.inputs[i].name === "toggles_json") {
                            this.removeInput(i);
                        }
                    }
                };

                const hideWidget = (name) => {
                    const w = this.widgets.find(w => w.name === name);
                    if (w) {
                        w.type = "hidden";
                        w.computeSize = () =>[0, -4];
                        if (w.inputEl) w.inputEl.style.display = "none";
                    }
                };
                
                hideWidget("rules_json");
                hideWidget("toggles_json");
                removeExtraInputs();

                const container = document.createElement("div");
                container.className = "pp-node-ui";
                container.addEventListener("pointerdown", e => e.stopPropagation());
                container.addEventListener("mousedown", e => e.stopPropagation());
                container.addEventListener("wheel", e => e.stopPropagation());
                container.addEventListener("keydown", e => e.stopPropagation());

                const rulesWidget = this.widgets.find(w => w.name === "rules_json");
                const togglesWidget = this.widgets.find(w => w.name === "toggles_json");

                const saveRules = (rules) => { if (rulesWidget) rulesWidget.value = JSON.stringify(rules); app.graph.setDirtyCanvas(true); };
                const saveToggles = (toggles) => { if (togglesWidget) togglesWidget.value = JSON.stringify(toggles); app.graph.setDirtyCanvas(true); };

                const render = () => {
                    let rules =[]; let toggles = {};
                    try { rules = JSON.parse(rulesWidget?.value || "[]"); } catch (e) { rules =[]; }
                    try { toggles = JSON.parse(togglesWidget?.value || "{}"); } catch (e) { toggles = {}; }

                    const featureNames =["女角色净化", "女装净化", "发型剪短", "身材矫正", "去除马赛克", "去除妆容"];
                    featureNames.forEach(f => { if (toggles[f] === undefined) toggles[f] = true; });

                    container.innerHTML = `
                        <div class="pp-preview-box" id="pp-preview-box">等待运行节点以生成预览...</div>
                        <div class="pp-legend">
                            <span class="pp-leg-norm">原词</span>
                            <span class="pp-leg-del">删除</span>
                            <span class="pp-leg-mod">修改</span>
                            <span class="pp-leg-add">新增</span>
                        </div>
                    `;

                    const togglesDiv = document.createElement("div");
                    togglesDiv.className = "pp-toggles";
                    featureNames.forEach(f => {
                        const btn = document.createElement("button");
                        btn.innerText = f;
                        btn.className = toggles[f] ? "pp-toggle-btn pp-toggle-on" : "pp-toggle-btn pp-toggle-off";
                        btn.onclick = () => { toggles[f] = !toggles[f]; saveToggles(toggles); render(); };
                        togglesDiv.appendChild(btn);
                    });
                    container.appendChild(togglesDiv);

                    const topBar = document.createElement("div");
                    topBar.className = "pp-top";
                    topBar.innerHTML = `
                        <button class="pp-btn pp-btn-add" id="add-btn">+ 添加自定义规则</button>
                        <div style="display:flex; gap:6px;">
                            <button class="pp-btn" id="import-btn">📂 导入</button>
                            <button class="pp-btn" id="export-btn">💾 导出</button>
                        </div>
                    `;
                    container.appendChild(topBar);

                    if (rules.length === 0) {
                        const emptyDiv = document.createElement("div");
                        emptyDiv.style.textAlign = "center"; emptyDiv.style.color = "#8E8E93"; emptyDiv.style.padding = "10px 0";
                        emptyDiv.innerText = "暂无自定义规则";
                        container.appendChild(emptyDiv);
                    }

                    rules.forEach((rule, rIdx) => {
                        const ruleDiv = document.createElement("div");
                        ruleDiv.className = "pp-rule";

                        if (rule.condition === 'not_contains') {
                            let actHTML = '';
                            if (rule.action === 'add') {
                                actHTML = `<input class="pp-input r-repl" data-r="${rIdx}" value="${rule.replacement||''}" placeholder="新增词语" style="flex:1;" />`;
                            } else if (rule.action === 'delete') {
                                actHTML = `<input class="pp-input r-target" data-r="${rIdx}" value="${rule.target||''}" placeholder="目标词" style="flex:1;" />`;
                            } else if (rule.action === 'modify') {
                                actHTML = `
                                    <input class="pp-input r-target" data-r="${rIdx}" value="${rule.target||''}" placeholder="原词" style="width:50px;" />
                                    <span style="color:#8E8E93; font-size:11px;">改为</span>
                                    <input class="pp-input r-repl" data-r="${rIdx}" value="${rule.replacement||''}" placeholder="新词" style="width:50px;" />
                                `;
                            }

                            ruleDiv.innerHTML = `
                                <div class="pp-row">
                                    <select class="pp-select r-cond" data-r="${rIdx}" style="color:#FF453A;">
                                        <option value="contains">检测到含</option>
                                        <option value="not_contains" selected>检测不到</option>
                                        <option value="exact">完整匹配</option>
                                    </select>
                                    <input class="pp-input w-in" data-r="${rIdx}" data-w="0" value="${(rule.words[0]||'').replace(/"/g, '&quot;')}" placeholder="变量a (检测词)" style="width:80px;" />
                                    <span style="color:#8E8E93; font-size:11px;">时：</span>
                                    <select class="pp-select r-action" data-r="${rIdx}">
                                        <option value="add" ${rule.action === 'add' ? 'selected' : ''}>添加</option>
                                        <option value="delete" ${rule.action === 'delete' ? 'selected' : ''}>删除</option>
                                        <option value="modify" ${rule.action === 'modify' ? 'selected' : ''}>把某改某某</option>
                                    </select>
                                </div>
                                <div class="pp-row">
                                    ${actHTML}
                                    <button class="pp-btn pp-btn-del r-del" data-r="${rIdx}" style="margin-left: auto;">删除此条</button>
                                </div>
                            `;
                        } else {
                            let wordsHTML = rule.words.map((w, wIdx) => `
                                <div class="pp-word">
                                    <input data-r="${rIdx}" data-w="${wIdx}" class="w-in" value="${w.replace(/"/g, '&quot;')}" placeholder="词语"/>
                                    ${rule.words.length > 1 ? `<button data-r="${rIdx}" data-w="${wIdx}" class="w-del">x</button>` : ''}
                                </div>
                            `).join('');

                            ruleDiv.innerHTML = `
                                <div class="pp-row">
                                    <select class="pp-select r-cond" data-r="${rIdx}">
                                        <option value="contains" ${rule.condition === 'contains' ? 'selected' : ''}>检测到含</option>
                                        <option value="not_contains" ${rule.condition === 'not_contains' ? 'selected' : ''}>检测不到</option>
                                        <option value="exact" ${rule.condition === 'exact' ? 'selected' : ''}>完整匹配</option>
                                    </select>
                                    ${wordsHTML}
                                    <button class="pp-btn w-add" data-r="${rIdx}">+ 词语</button>
                                    <button class="pp-btn pp-btn-del r-del" data-r="${rIdx}" style="margin-left: auto;">删除此条</button>
                                </div>
                                <div class="pp-row">
                                    ${rule.words.length > 1 ? `
                                        <select class="pp-select r-logic" data-r="${rIdx}">
                                            <option value="OR" ${rule.logic === 'OR' ? 'selected' : ''}>（或）</option>
                                            <option value="AND" ${rule.logic === 'AND' ? 'selected' : ''}>（和）</option>
                                        </select>
                                    ` : ''}
                                    <select class="pp-select r-action" data-r="${rIdx}">
                                        <option value="modify_content" ${rule.action === 'modify_content' ? 'selected' : ''}>修改检测内容为</option>
                                        <option value="modify_exact" ${rule.action === 'modify_exact' ? 'selected' : ''}>修改完整匹配词为</option>
                                        <option value="delete" ${rule.action === 'delete' ? 'selected' : ''}>删除</option>
                                    </select>
                                    ${rule.action !== 'delete' ? `
                                        <input class="pp-input r-repl" data-r="${rIdx}" value="${(rule.replacement||'').replace(/"/g, '&quot;')}" placeholder="替换词语" style="flex:1;" />
                                    ` : ''}
                                </div>
                            `;
                        }
                        container.appendChild(ruleDiv);
                    });

                    container.querySelector("#add-btn").onclick = () => { rules.push({ condition: 'contains', logic: 'OR', words:[''], action: 'modify_content', replacement: '' }); saveRules(rules); render(); };
                    container.querySelector("#export-btn").onclick = () => { const blob = new Blob([JSON.stringify(rules, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "prompt_rules.json"; a.click(); URL.revokeObjectURL(url); };
                    container.querySelector("#import-btn").onclick = () => { const input = document.createElement("input"); input.type = "file"; input.accept = ".json"; input.onchange = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => { try { saveRules(JSON.parse(ev.target.result)); render(); } catch(err) { alert("导入失败"); }}; reader.readAsText(file); }; input.click(); };

                    container.querySelectorAll(".r-cond").forEach(el => el.onchange = (e) => { rules[e.target.dataset.r].condition = e.target.value; if(e.target.value === 'not_contains') { rules[e.target.dataset.r].action = 'add'; } saveRules(rules); render(); });
                    container.querySelectorAll(".r-logic").forEach(el => el.onchange = (e) => { rules[e.target.dataset.r].logic = e.target.value; saveRules(rules); render(); });
                    container.querySelectorAll(".r-action").forEach(el => el.onchange = (e) => { rules[e.target.dataset.r].action = e.target.value; saveRules(rules); render(); });
                    container.querySelectorAll(".r-target").forEach(el => el.onchange = (e) => { rules[e.target.dataset.r].target = e.target.value; saveRules(rules); });
                    container.querySelectorAll(".r-repl").forEach(el => el.onchange = (e) => { rules[e.target.dataset.r].replacement = e.target.value; saveRules(rules); });
                    container.querySelectorAll(".r-del").forEach(el => el.onclick = (e) => { rules.splice(e.target.dataset.r, 1); saveRules(rules); render(); });
                    
                    container.querySelectorAll(".w-add").forEach(el => el.onclick = (e) => { rules[e.target.dataset.r].words.push(''); saveRules(rules); render(); });
                    container.querySelectorAll(".w-in").forEach(el => el.onchange = (e) => { rules[e.target.dataset.r].words[e.target.dataset.w] = e.target.value; saveRules(rules); });
                    container.querySelectorAll(".w-del").forEach(el => el.onclick = (e) => { rules[e.target.dataset.r].words.splice(e.target.dataset.w, 1); saveRules(rules); render(); });
                };

                render();

                const domWidget = this.addDOMWidget("HTML_Rules", "HTML", container);
                domWidget.computeSize = () =>[450, 420]; 
                
                // 确保节点被拉伸以适应高度
                this.setSize([480, 480]);
                
                this.ppContainer = container;
                return this;
            };

            const onExecuted = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function (message) {
                if (onExecuted) onExecuted.apply(this, arguments);
                if (message && message.preview_rich && this.ppContainer) {
                    const previewBox = this.ppContainer.querySelector("#pp-preview-box");
                    if (previewBox) {
                        try {
                            const tags = JSON.parse(message.preview_rich[0]);
                            const htmlTags = tags.map(t => {
                                const textToShow = (t.state === 'deleted' && t.orig) ? t.orig : t.text;
                                return `<span class="pp-tag-${t.state}">${textToShow}</span>`;
                            });
                            previewBox.innerHTML = htmlTags.join(', ');
                        } catch (e) {
                            previewBox.innerHTML = "预览渲染失败";
                        }
                    }
                }
            };
        }
    }
});