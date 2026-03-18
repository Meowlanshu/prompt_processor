import { app } from "../../scripts/app.js";
import { ComfyWidgets } from "../../scripts/widgets.js";

const style = document.createElement("style");
style.innerHTML = `
    .pp-node-ui {
        background: #1e1e1e; padding: 10px; border-radius: 6px; 
        color: #ddd; font-family: sans-serif; font-size: 12px;
        display: flex; flex-direction: column; gap: 8px;
        box-sizing: border-box; width: 100%; min-height: 180px; max-height: 400px;
        overflow-y: auto; border: 1px solid #333;
    }
    .pp-node-ui::-webkit-scrollbar { width: 6px; }
    .pp-node-ui::-webkit-scrollbar-thumb { background: #555; border-radius: 3px; }
    .pp-top { display: flex; justify-content: space-between; padding-bottom: 5px; border-bottom: 1px solid #333; }
    
    /* 横向开关按钮样式 */
    .pp-toggles { display: flex; flex-wrap: wrap; gap: 6px; padding-bottom: 6px; border-bottom: 1px dashed #333; }
    .pp-toggle-btn { padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; border: 1px solid transparent; transition: 0.2s; font-weight: bold; }
    .pp-toggle-on { background: #2b5f9e; color: #fff; border-color: #3a7bd5; }
    .pp-toggle-on:hover { background: #3a7bd5; }
    .pp-toggle-off { background: #2a2a2a; color: #777; border-color: #444; }
    .pp-toggle-off:hover { background: #333; color: #aaa; }

    .pp-rule { background: #282828; border: 1px solid #444; border-radius: 4px; padding: 8px; display: flex; flex-direction: column; gap: 8px; }
    .pp-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
    .pp-btn { background: #444; color: #fff; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px; }
    .pp-btn:hover { background: #555; }
    .pp-btn-add { background: #2e662e; }
    .pp-btn-add:hover { background: #3a823a; }
    .pp-btn-del { background: #8b3535; }
    .pp-btn-del:hover { background: #a84242; }
    .pp-input, .pp-select { background: #111; color: #fff; border: 1px solid #555; padding: 4px; border-radius: 3px; font-size: 11px; outline: none; }
    .pp-input:focus { border-color: #3a7bd5; }
    .pp-word { display: flex; align-items: center; background: #1a1a1a; border: 1px solid #555; border-radius: 3px; }
    .pp-word input { border: none; background: transparent; color: #fff; width: 50px; padding: 4px; font-size: 11px; outline: none; }
    .pp-word button { background: transparent; border: none; border-left: 1px solid #555; color: #888; cursor: pointer; padding: 4px 6px; }
    .pp-word button:hover { background: #d9534f; color: #fff; }
`;
document.head.appendChild(style);

app.registerExtension({
    name: "Comfy.PromptProcessor",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "PromptProcessorNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);

                // 隐藏后端用的 JSON 数据中转框
                const rulesWidget = this.widgets.find(w => w.name === "rules_json");
                if (rulesWidget) {
                    rulesWidget.type = "hidden";
                    rulesWidget.computeSize = () => [0, -4]; 
                    if (rulesWidget.inputEl) rulesWidget.inputEl.style.display = "none";
                }
                const togglesWidget = this.widgets.find(w => w.name === "toggles_json");
                if (togglesWidget) {
                    togglesWidget.type = "hidden";
                    togglesWidget.computeSize = () => [0, -4]; 
                    if (togglesWidget.inputEl) togglesWidget.inputEl.style.display = "none";
                }

                const container = document.createElement("div");
                container.className = "pp-node-ui";
                
                // 阻止鼠标事件干扰 LiteGraph 画布
                container.addEventListener("pointerdown", e => e.stopPropagation());
                container.addEventListener("mousedown", e => e.stopPropagation());
                container.addEventListener("wheel", e => e.stopPropagation());
                container.addEventListener("keydown", e => e.stopPropagation());

                const saveRules = (rules) => {
                    if (rulesWidget) rulesWidget.value = JSON.stringify(rules);
                    app.graph.setDirtyCanvas(true);
                };

                const saveToggles = (toggles) => {
                    if (togglesWidget) togglesWidget.value = JSON.stringify(toggles);
                    app.graph.setDirtyCanvas(true);
                };

                const render = () => {
                    let rules = [];
                    let toggles = {};
                    try { rules = JSON.parse(rulesWidget?.value || "[]"); } catch (e) { rules =[]; }
                    try { toggles = JSON.parse(togglesWidget?.value || "{}"); } catch (e) { toggles = {}; }

                    // 初始化默认均为开启状态
                    const featureNames =["女角色净化", "女装净化", "发型剪短", "去除马赛克", "去除妆容"];
                    featureNames.forEach(f => {
                        if (toggles[f] === undefined) toggles[f] = true;
                    });

                    container.innerHTML = "";

                    // 1. 横排的功能开关区
                    const togglesDiv = document.createElement("div");
                    togglesDiv.className = "pp-toggles";
                    featureNames.forEach(f => {
                        const btn = document.createElement("button");
                        btn.innerText = f;
                        btn.className = toggles[f] ? "pp-toggle-btn pp-toggle-on" : "pp-toggle-btn pp-toggle-off";
                        btn.onclick = () => {
                            toggles[f] = !toggles[f];
                            saveToggles(toggles);
                            render(); // 点击后重新渲染开关颜色
                        };
                        togglesDiv.appendChild(btn);
                    });
                    container.appendChild(togglesDiv);

                    // 2. 自定义规则顶栏
                    const topBar = document.createElement("div");
                    topBar.className = "pp-top";
                    topBar.innerHTML = `
                        <button class="pp-btn pp-btn-add" id="add-btn">+ 添加自定义规则</button>
                        <div>
                            <button class="pp-btn" id="import-btn">📂 导入</button>
                            <button class="pp-btn" id="export-btn">💾 导出</button>
                        </div>
                    `;
                    container.appendChild(topBar);

                    if (rules.length === 0) {
                        const emptyDiv = document.createElement("div");
                        emptyDiv.style.textAlign = "center";
                        emptyDiv.style.color = "#555";
                        emptyDiv.style.padding = "10px 0";
                        emptyDiv.innerText = "暂无自定义规则";
                        container.appendChild(emptyDiv);
                    }

                    // 3. 渲染每一条自定义规则
                    rules.forEach((rule, rIdx) => {
                        const ruleDiv = document.createElement("div");
                        ruleDiv.className = "pp-rule";

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
                        container.appendChild(ruleDiv);
                    });

                    // 绑定事件
                    container.querySelector("#add-btn").onclick = () => {
                        rules.push({ condition: 'contains', logic: 'OR', words: [''], action: 'modify_content', replacement: '' });
                        saveRules(rules); render();
                    };
                    container.querySelector("#export-btn").onclick = () => {
                        const blob = new Blob([JSON.stringify(rules, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a"); a.href = url; a.download = "prompt_rules.json"; a.click(); URL.revokeObjectURL(url);
                    };
                    container.querySelector("#import-btn").onclick = () => {
                        const input = document.createElement("input"); input.type = "file"; input.accept = ".json";
                        input.onchange = (e) => {
                            const file = e.target.files[0]; if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                                try { saveRules(JSON.parse(ev.target.result)); render(); } 
                                catch(err) { alert("导入失败，格式错误"); }
                            };
                            reader.readAsText(file);
                        };
                        input.click();
                    };

                    container.querySelectorAll(".r-cond").forEach(el => el.onchange = (e) => { rules[e.target.dataset.r].condition = e.target.value; saveRules(rules); render(); });
                    container.querySelectorAll(".r-logic").forEach(el => el.onchange = (e) => { rules[e.target.dataset.r].logic = e.target.value; saveRules(rules); render(); });
                    container.querySelectorAll(".r-action").forEach(el => el.onchange = (e) => { rules[e.target.dataset.r].action = e.target.value; saveRules(rules); render(); });
                    container.querySelectorAll(".r-repl").forEach(el => el.onchange = (e) => { rules[e.target.dataset.r].replacement = e.target.value; saveRules(rules); });
                    container.querySelectorAll(".r-del").forEach(el => el.onclick = (e) => { rules.splice(e.target.dataset.r, 1); saveRules(rules); render(); });
                    
                    container.querySelectorAll(".w-add").forEach(el => el.onclick = (e) => { rules[e.target.dataset.r].words.push(''); saveRules(rules); render(); });
                    container.querySelectorAll(".w-in").forEach(el => el.onchange = (e) => { rules[e.target.dataset.r].words[e.target.dataset.w] = e.target.value; saveRules(rules); });
                    container.querySelectorAll(".w-del").forEach(el => el.onclick = (e) => { rules[e.target.dataset.r].words.splice(e.target.dataset.w, 1); saveRules(rules); render(); });
                };

                render();

                const domWidget = this.addDOMWidget("HTML_Rules", "HTML", container);
                domWidget.computeSize = () => [400, 240]; 

                // 纯预览结果展示
                const previewWidget = ComfyWidgets["STRING"](this, "结果预览 (仅供查看)",["STRING", { multiline: true }], app).widget;
                previewWidget.inputEl.readOnly = true;
                previewWidget.inputEl.style.opacity = 0.6;
                previewWidget.inputEl.style.backgroundColor = "#222";
                previewWidget.serialize = false; 

                return this;
            };

            const onExecuted = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function (message) {
                if (onExecuted) onExecuted.apply(this, arguments);
                if (message && message.preview) {
                    const previewWidget = this.widgets.find(w => w.name === "结果预览 (仅供查看)");
                    if (previewWidget) previewWidget.value = message.preview[0];
                }
            };
        }
    }
});