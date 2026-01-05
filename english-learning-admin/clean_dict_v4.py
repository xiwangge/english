import re
import os

input_file = '/Users/xiwang/github/english/english-learning-admin/cedict_1_0_ts_utf-8_mdbg.txt'
output_file = '/Users/xiwang/github/english/english-learning-admin/cedict_cleaned.txt'
tgscc_file = '/Users/xiwang/github/english/english-learning-admin/tgscc_6500.txt'

# Load the first 3500 characters (Level 1)
# These are the most common standard characters.
with open(tgscc_file, 'r', encoding='utf-8') as f:
    all_chars = f.read()
    level1_chars = set(all_chars[:3500])

# Regex to catch variant/archaic/dialect definitions
# People learning English don't usually want these obscure translations.
exclude_pattern = re.compile(r'/(?:old variant of|variant of|traditional variant of|archaic variant of|informal variant of|Japanese variant of|erroneous variant of|rare variant of|non-standard variant of|literary|archaic|dialect)', re.IGNORECASE)

# Allowed characters: Level 1 Chinese + Common ASCII/Punctuation
allowed_symbols = set("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ -_/.，。！？；： （ ）()[]%#")

def is_word_common(word):
    for char in word:
        if char in level1_chars:
            continue
        if char in allowed_symbols:
            continue
        # If it's a CJK ideograph but not in Level 1, it's "rare" for our purposes
        if 0x4E00 <= ord(char) <= 0x9FFF:
            return False
        # Other symbols that aren't in our allowed set but are common?
        # Let's keep it strict to Level 1 Chinese.
    return True

def clean_cedict():
    count_total = 0
    count_kept = 0
    count_removed_rare = 0
    count_removed_variant = 0
    
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
            
            # 1. Filter out variants / archaic / dialect
            if exclude_pattern.search(remainder):
                count_removed_variant += 1
                continue
            
            # 2. Filter out words containing rare characters (Not in Level 1)
            # We only check the SIMPLIFIED column here, as the user wants to keep the 
            # Traditional column data but ensure the translation itself is common.
            # Actually, standard CEDICT has S column as the primary translation target.
            if not is_word_common(simplified):
                count_removed_rare += 1
                continue
            
            out.write(line)
            count_kept += 1
            
    print(f"Total entries processed: {count_total}")
    print(f"Entries kept: {count_kept}")
    print(f"Removed due to variants/archaic tags: {count_removed_variant}")
    print(f"Removed due to rare characters (Non-Level 1): {count_removed_rare}")

if __name__ == "__main__":
    clean_cedict()
