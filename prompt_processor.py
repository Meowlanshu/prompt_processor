import json
import re

class PromptProcessorNode:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                # forceInput: True 会强制 ComfyUI 不显示输入框，只保留左侧的连接点
                "text": ("STRING", {"forceInput": True, "tooltip": "输入原始Prompt"}),
                "rules_json": ("STRING", {"default": "[]"}),
                "toggles_json": ("STRING", {"default": "{}"}), 
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("processed_text",)
    FUNCTION = "process"
    CATEGORY = "Custom/Text"
    OUTPUT_NODE = True

    def process(self, text, rules_json, toggles_json):
        tags = [t.strip() for t in text.split(',')]
        tags = [t for t in tags if t] 
        
        # 解析开关状态（如果前端没传，默认都是 True 开启）
        try:
            toggles = json.loads(toggles_json)
        except:
            toggles = {}
            
        女角色净化 = toggles.get("女角色净化", True)
        女装净化 = toggles.get("女装净化", True)
        发型剪短 = toggles.get("发型剪短", True)
        去除马赛克 = toggles.get("去除马赛克", True)
        去除妆容 = toggles.get("去除妆容", True)
        
        # 1. 女角色净化
        if 女角色净化:
            tags = self.process_char_purify(tags)
            
        # 2. 女装净化
        if 女装净化:
            cloth_del_words =['skirt', 'thighhighs', 'kneehighs', 'pantyhose', 'ankle lace-up', 'high heels', 'pumps', 'stiletto heels', 'wedge heels', 'dress', 'bra']
            tags =[t for t in tags if not any(w in t.lower() for w in cloth_del_words)]
            
        # 3. 发型剪短
        if 发型剪短:
            hair_del_words = ['medium hair', 'long hair', 'very long hair', 'absurdly long hair']
            tags =[t for t in tags if not any(w in t.lower() for w in hair_del_words)]

        # 4. 去除马赛克
        if 去除马赛克:
            mosaic_del_words =[
                'bar censor', 'blank censor', 'blur censor', 'censored by text',
                'emoji censor', 'flower censor', 'glitch censor', 'heart censor',
                'interface censor', 'light censor', 'mosaic censoring', 'novelty censor',
                'character censor', 'patreon logo censor', 'scribble censor'
            ]
            tags =[t for t in tags if not any(w in t.lower() for w in mosaic_del_words)]

        # 5. 去除妆容
        if 去除妆容:
            makeup_del_words =['makeup', 'blush', 'lipstick', 'eyelashes', 'eyeshadow']
            tags =[t for t in tags if not any(w in t.lower() for w in makeup_del_words)]

        # 6. 自定义规则逻辑
        try:
            custom_rules = json.loads(rules_json)
        except:
            custom_rules =[]

        for rule in custom_rules:
            cond = rule.get('condition', 'contains')
            logic = rule.get('logic', 'OR')
            words = rule.get('words',[])
            action = rule.get('action', 'delete')
            repl = rule.get('replacement', '')

            if not words: continue

            new_tags =[]
            for t in tags:
                t_lower = t.lower()
                matched_words =[]
                
                if cond == 'contains':
                    matched_words =[w for w in words if w.lower() in t_lower]
                    is_match = len(matched_words) > 0 if logic == 'OR' else len(matched_words) == len(words)
                elif cond == 'exact':
                    matched_words =[w for w in words if w.lower() == t.strip().lower()]
                    is_match = len(matched_words) > 0 if logic == 'OR' else (len(matched_words) == len(words) and len(words) == 1)
                elif cond == 'not_contains':
                    if logic == 'OR':
                        is_match = any(w.lower() not in t_lower for w in words)
                    else:
                        is_match = all(w.lower() not in t_lower for w in words)
                else:
                    is_match = False

                if is_match:
                    if action == 'delete':
                        continue
                    elif action == 'modify_exact':
                        new_tags.append(repl)
                    elif action == 'modify_content':
                        if cond in ['contains', 'exact']:
                            temp_t = t
                            for mw in matched_words:
                                temp_t = re.compile(re.escape(mw), re.IGNORECASE).sub(repl, temp_t)
                            new_tags.append(temp_t)
                        else:
                            new_tags.append(repl) 
                else:
                    new_tags.append(t)
            tags = new_tags

        processed_text = ", ".join(tags)
        return {"ui": {"preview": [processed_text]}, "result": (processed_text,)}

    def process_char_purify(self, tags):
        boy_matches = []
        girl_matches =[]
        
        for i, tag in enumerate(tags):
            tag_c = tag.strip().lower()
            if re.match(r'^(\d+)?\s*boys?$', tag_c):
                boy_matches.append((i, tag_c))
            elif re.match(r'^(\d+)?\s*girls?$', tag_c):
                girl_matches.append((i, tag_c))

        has_boy_anywhere = any('boy' in t.lower() for t in tags)

        if boy_matches or girl_matches:
            if has_boy_anywhere:
                total = 0
                for _, t in boy_matches:
                    m = re.match(r'^(\d+)', t)
                    total += int(m.group(1)) if m else 1
                for _, t in girl_matches:
                    m = re.match(r'^(\d+)', t)
                    total += int(m.group(1)) if m else 1

                to_remove = set([i for i, _ in boy_matches] +[i for i, _ in girl_matches])
                tags = [t for i, t in enumerate(tags) if i not in to_remove]

                if total == 0: total = 1
                new_tag = f"{total}boys" if total > 1 else f"{total}boy"
                tags.insert(0, new_tag)

        has_boy_anywhere_now = any('boy' in t.lower() for t in tags)

        final_tags =[]
        for tag in tags:
            tag_lower = tag.lower()

            if any(w in tag_lower for w in['futa', 'futanari', 'girly', 'trap']):
                continue

            if has_boy_anywhere_now:
                if 'girl' in tag_lower:
                    continue
            else:
                tag = re.sub(r'(?i)girls', 'boys', tag)
                tag = re.sub(r'(?i)girl', 'boy', tag)

            replacements = {
                r'(?i)female': 'male',
                r'(?i)loli': 'shota',
                r'(?i)onee': 'onii',
                r'(?i)hetero': 'gay',
                r'(?i)yuri': 'yaoi',
                r'(?i)pussy': 'anus',
                r'(?i)vaginal': 'anus',
                r'(?i)breasts': 'pectorals'
            }
            for patt, repl in replacements.items():
                tag = re.sub(patt, repl, tag)

            final_tags.append(tag)

        return final_tags