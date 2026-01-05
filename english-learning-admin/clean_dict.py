import re

input_file = '/Users/xiwang/github/english/english-learning-admin/cedict_1_0_ts_utf-8_mdbg.txt'
output_file = '/Users/xiwang/github/english/english-learning-admin/cedict_cleaned.txt'

# Regex to catch archaic/variant definitions
# These usually indicate entries that a standard learner doesn't need
variant_pattern = re.compile(r'/(?:old variant of|variant of|traditional variant of|archaic variant of|informal variant of|Japanese variant of|erroneous variant of|rare variant of|non-standard variant of)', re.IGNORECASE)

# Also check for characters used in names only or place names only if they seem rare
name_pattern = re.compile(r'/(?:used in place names|used in names|surname)', re.IGNORECASE)

def is_rare(char):
    cp = ord(char)
    # Basic Latin, numbers, common punctuation are fine
    if cp < 0x2E80: return False
    
    # CJK Radicals Supplement: 2E80–2EFF
    # Kangxi Radicals: 2F00–2FDF
    if 0x2E80 <= cp <= 0x2FDF: return True
    
    # Ideographic Description Characters: 2FF0–2FFF (Not actual characters)
    if 0x2FF0 <= cp <= 0x2FFF: return True
    
    # CJK Symbols and Punctuation: 3000–303F (Except common ones)
    if 0x3000 <= cp <= 0x303F:
        if char in "，。！？；： （ ）": return False
        return True
        
    # Suzhou Numerals etc are in 3021-303F
    
    # CJK Unified Ideographs Extension A: 3400–4DBF
    if 0x3400 <= cp <= 0x4DBF: return True
    
    # CJK Unified Ideographs: 4E00–9FFF (Standard)
    # Within this block, some are still rare, but hard to filter without a list.
    if 0x4E00 <= cp <= 0x9FFF: return False
    
    # CJK Compatibility Ideographs: F900–FAFF
    if 0xF900 <= cp <= 0xFAFF: return True
    
    # CJK Unified Ideographs Extension B-I: 20000 and above
    if cp >= 0x20000: return True
    
    return False

def contains_rare(text):
    for char in text:
        if is_rare(char):
            return True
    return False

def build_traditional_set():
    trad_chars = set()
    with open(input_file, 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith('#'): continue
            parts = line.split(' ')
            if len(parts) < 2: continue
            t, s = parts[0], parts[1]
            if t != s and len(t) == len(s):
                for i in range(len(t)):
                    if t[i] != s[i]:
                        trad_chars.add(t[i])
    return trad_chars

def process():
    trad_chars = build_traditional_set()
    count_total = 0
    count_kept = 0
    count_variant = 0
    count_rare = 0
    count_trad = 0
    
    with open(input_file, 'r', encoding='utf-8') as f, \
         open(output_file, 'w', encoding='utf-8') as out:
        
        for line in f:
            if line.startswith('#'):
                out.write(line)
                continue
            
            count_total += 1
            parts = line.split(' ', 2)
            if len(parts) < 3:
                out.write(line)
                count_kept += 1
                continue
            
            traditional = parts[0]
            simplified = parts[1]
            remainder = parts[2]
            
            # 1. Variant check
            if variant_pattern.search(remainder):
                count_variant += 1
                continue
            
            # 2. Traditional check (in Simplified column)
            is_trad = False
            for char in simplified:
                if char in trad_chars:
                    is_trad = True
                    break
            if is_trad:
                count_trad += 1
                continue
            
            # 3. Rare character check
            if contains_rare(simplified) or contains_rare(traditional):
                count_rare += 1
                continue
            
            out.write(line)
            count_kept += 1
            
    print(f"Total: {count_total}")
    print(f"Kept: {count_kept}")
    print(f"Removed (Variant): {count_variant}")
    print(f"Removed (Traditional): {count_trad}")
    print(f"Removed (Rare): {count_rare}")

process()
