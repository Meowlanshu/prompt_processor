import json
import re

class PromptProcessorNode:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
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
        raw_tags =[t.strip() for t in text.split(',') if t.strip()]
        items =[{"text": t, "orig": t, "state": "normal"} for t in raw_tags]
        
        try: toggles = json.loads(toggles_json)
        except: toggles = {}
            
        女角色净化 = toggles.get("女角色净化", True)
        女装净化 = toggles.get("女装净化", True)
        发型剪短 = toggles.get("发型剪短", True)
        身材矫正 = toggles.get("身材矫正", True)
        去除马赛克 = toggles.get("去除马赛克", True)
        去除妆容 = toggles.get("去除妆容", True)
        
        # 1. 女角色净化
        if 女角色净化:
            items = self.process_char_purify(items)
            
        # 2. 女装净化
        if 女装净化:
            # 整词删除
            cloth_patterns =[
                r'skirt', r'thighhighs', r'kneehighs', r'pantyhose', r'ankle lace-up', 
                r'high heels', r'pumps', r'stiletto heels', r'wedge heels', r'dress', r'\bbra\b',
                r'cameltoe', r'hair ribbon', r'ribbon hair', r'neck ribbon'
            ]
            for it in items:
                if it["state"] != "deleted" and any(re.search(p, it["text"].lower()) for p in cloth_patterns):
                    it["state"] = "deleted"
            
            # 局部替换
            cloth_replacements = {
                r'(?i)\bbikini\b(?!\s*briefs)': 'bikini briefs',
                r'(?i)\b(micro shorts|highleg shorts)\b': 'boxer shorts',
                r'(?i)\bshort shorts\b': 'male shorts',
                r'(?i)\bpuffy shorts\b': 'baggy shorts'
            }
            for it in items:
                if it["state"] == "deleted": continue
                orig = it["text"]
                for patt, repl in cloth_replacements.items():
                    it["text"] = re.sub(patt, repl, it["text"])
                if it["text"] != orig:
                    it["state"] = "modified"

        # 3. 发型剪短
        if 发型剪短:
            hair_words =['medium hair', 'long hair', 'very long hair', 'absurdly long hair']
            for it in items:
                if it["state"] != "deleted" and any(w in it["text"].lower() for w in hair_words):
                    it["state"] = "deleted"
                    
        # 4. 身材矫正 (完美修正版)
        if 身材矫正:
            tags_to_add =[]
            
            curvy_patt = r'(?i)\b(wide hips|pear-shaped figure|curvy|plump|hip dips)\b'
            petite_patt = r'(?i)\bpetite\b'
            narrow_patt = r'(?i)\b(narrow hips|narrow waist)\b'
            
            for it in items:
                if it["state"] == "deleted": continue
                orig = it["text"]
                
                # 微胖/宽胯 路线
                if re.search(curvy_patt, orig):
                    it["text"] = re.sub(curvy_patt, 'strongman waist', it["text"])
                    tags_to_add.append('alternate muscle size') # 增加肌肉差
                
                # 娇小 路线
                if re.search(petite_patt, orig):
                    it["text"] = re.sub(petite_patt, 'v-taper', it["text"])
                    tags_to_add.extend(['muscular child', 'child']) # 增加正太肌肉
                    
                # 瘦腰 路线
                if re.search(narrow_patt, orig):
                    it["text"] = re.sub(narrow_patt, 'v-taper', it["text"])
                    tags_to_add.extend(['shredded muscles', 'toned']) # 增加干拉丝肌肉
                    
                if it["text"] != orig:
                    it["state"] = "modified"
                    
            # 自动去重，将关联的肌肉 Buff 词添加到末尾
            existing_tags = set(it["text"].lower() for it in items if it["state"] != "deleted")
            for t in tags_to_add:
                if t.lower() not in existing_tags:
                    items.append({"text": t, "orig": "", "state": "added"})
                    existing_tags.add(t.lower())

        # 5. 去除马赛克
        if 去除马赛克:
            mosaic_words =['bar censor', 'blank censor', 'blur censor', 'censored by text', 'emoji censor', 'flower censor', 'glitch censor', 'heart censor', 'interface censor', 'light censor', 'mosaic censoring', 'novelty censor', 'character censor', 'patreon logo censor', 'scribble censor']
            for it in items:
                if it["state"] != "deleted" and any(w in it["text"].lower() for w in mosaic_words):
                    it["state"] = "deleted"

        # 6. 去除妆容
        if 去除妆容:
            makeup_words =['makeup', 'blush', 'lipstick', 'eyelashes', 'eyeshadow']
            for it in items:
                if it["state"] != "deleted" and any(w in it["text"].lower() for w in makeup_words):
                    it["state"] = "deleted"

        # 7. 自定义 HTML 界面规则逻辑
        try: custom_rules = json.loads(rules_json)
        except: custom_rules =[]

        for rule in custom_rules:
            cond = rule.get('condition', 'contains')
            words = rule.get('words',[])
            action = rule.get('action', 'delete')
            if not words: continue

            if cond == 'not_contains':
                a_word = words[0].lower()
                is_missing = True
                for it in items:
                    if it["state"] != "deleted" and a_word in it["text"].lower():
                        is_missing = False
                        break
                
                if is_missing:
                    if action == 'add':
                        repl = rule.get('replacement', '')
                        if repl: items.append({"text": repl, "orig": "", "state": "added"})
                    elif action == 'delete':
                        tgt = rule.get('target', '')
                        if tgt:
                            for it in items:
                                if it["state"] != "deleted" and tgt.lower() in it["text"].lower():
                                    it["state"] = "deleted"
                    elif action == 'modify':
                        tgt = rule.get('target', '')
                        repl = rule.get('replacement', '')
                        if tgt and repl:
                            for it in items:
                                if it["state"] != "deleted" and tgt.lower() in it["text"].lower():
                                    it["text"] = re.compile(re.escape(tgt), re.IGNORECASE).sub(repl, it["text"])
                                    it["state"] = "modified"
            else:
                logic = rule.get('logic', 'OR')
                repl = rule.get('replacement', '')
                for it in items:
                    if it["state"] == "deleted": continue
                    t_lower = it["text"].lower()
                    
                    if cond == 'contains':
                        matched =[w for w in words if w.lower() in t_lower]
                        is_match = len(matched) > 0 if logic == 'OR' else len(matched) == len(words)
                    elif cond == 'exact':
                        matched =[w for w in words if w.lower() == it["text"].strip().lower()]
                        is_match = len(matched) > 0 if logic == 'OR' else (len(matched) == len(words) and len(words) == 1)
                    else: is_match = False

                    if is_match:
                        if action == 'delete':
                            it["state"] = "deleted"
                        elif action == 'modify_exact':
                            it["text"] = repl
                            it["state"] = "modified"
                        elif action == 'modify_content':
                            if cond in['contains', 'exact']:
                                temp_t = it["text"]
                                for mw in matched:
                                    temp_t = re.compile(re.escape(mw), re.IGNORECASE).sub(repl, temp_t)
                                it["text"] = temp_t
                                it["state"] = "modified"

        processed_text = ", ".join([it["text"] for it in items if it["state"] != "deleted"])
        return {"ui": {"preview_rich":[json.dumps(items)]}, "result": (processed_text,)}

    def process_char_purify(self, items):
        count_pattern = re.compile(r'^[\(\[\]\s]*(\d+)?\s*(boy|boys|girl|girls)\s*([:\d\.]+)?[\)\]\s]*$', re.IGNORECASE)
        has_boy_anywhere = any(re.search(r'\bboys?\b', it["text"], re.IGNORECASE) for it in items if it["state"] != "deleted")
        
        counting_idx = set()
        total_count = 0
        has_plural = False
        
        for i, it in enumerate(items):
            if it["state"] == "deleted": continue
            m = count_pattern.match(it["text"])
            if m:
                counting_idx.add(i)
                num_str = m.group(1)
                word = m.group(2).lower()
                total_count += int(num_str) if num_str else 1
                if word in ['boys', 'girls'] or (num_str and int(num_str) > 1): has_plural = True

        if has_boy_anywhere and counting_idx:
            for i in counting_idx: items[i]["state"] = "deleted"
            new_tag = f"{total_count}boys" if (total_count > 1 or has_plural) else f"{total_count}boy" if total_count > 0 else "boy"
            items.insert(0, {"text": new_tag, "orig": "", "state": "added"})

        has_boy_anywhere_now = any(re.search(r'\bboys?\b', it["text"], re.IGNORECASE) for it in items if it["state"] != "deleted")

        for it in items:
            if it["state"] == "deleted": continue
            t_lower = it["text"].lower()

            if any(w in t_lower for w in['futa', 'futanari', 'girly', 'trap']):
                it["state"] = "deleted"
                continue

            orig_text = it["text"]
            if has_boy_anywhere_now:
                if 'girl' in t_lower:
                    it["state"] = "deleted"
                    continue
            else:
                it["text"] = re.sub(r'(?i)girls', 'boys', it["text"])
                it["text"] = re.sub(r'(?i)girl', 'boy', it["text"])

            replacements = {
                r'(?i)\bfemale\b': 'male', r'(?i)\bloli\b': 'shota', r'(?i)\bonee\b': 'onii',
                r'(?i)\bhetero\b': 'gay', r'(?i)\byuri\b': 'yaoi', r'(?i)\bpussy\b': 'anus',
                r'(?i)\bbreasts\b': 'pectorals', r'(?i)boob': 'pec'
            }
            for patt, repl in replacements.items():
                it["text"] = re.sub(patt, repl, it["text"])
                
            if it["text"] != orig_text:
                it["state"] = "modified"
                
        return items