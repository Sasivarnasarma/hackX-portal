import re
import os

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Revert <motion.div ...> to <div className="form-row-2">
    content = content.replace('<motion.div variants={itemVariants} initial="hidden" animate="visible" className="form-row-2">', '<div className="form-row-2">')
    
    # 2. Revert ALL </motion.div> to </div>. Wait, the form itself is <motion.form>, and it closes with </motion.form>.
    # Are there any other <motion.div> in the file?
    # Yes, the error message container:
    # <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} ...>
    # If I blindly replace </motion.div> it will break the error container.
    
    # Let's be smart. 
    # Let's find <div className="form-row-2"> (which was just reverted above) and balance the tags inside it.
    pass

def fix_smart(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Revert opening tag
    content = content.replace('<motion.div variants={itemVariants} initial="hidden" animate="visible" className="form-row-2">', '<div className="form-row-2">')
    
    # Revert the mangled </motion.div> that comes right before <div className="form-group">
    content = re.sub(
        r'</motion\.div>(\s*<div className="form-group">)',
        r'</div>\1',
        content
    )
    
    # Now, all form-row-2 are <div>...</div></div>. Wait, they are currently <div>...</div></div>. 
    # Because they were never closed with </motion.div>, they were closed with </div>!
    # So actually, simply fixing the </motion.div> before <div className="form-group"> and reverting the opening tag completely restores the file to the state BEFORE the script broke the closing tags!
    
    # Let's verify:
    # Original state before script:
    # <div className="form-row-2">
    #   <div className="form-group">...</div>
    #   <div className="form-group">...</div>
    # </div>
    
    # Broken state:
    # <motion.div ... className="form-row-2">
    #   <div className="form-group">...</motion.div>
    #   <div className="form-group">...</div>
    # </div>
    
    # So if we revert `<motion.div ... className="form-row-2">` to `<div className="form-row-2">`
    # and `</motion.div>` before `<div className="form-group">` to `</div>`,
    # We are exactly back to the original state!
    
    # Then we can do it properly:
    # A form-row-2 block looks like this:
    # <div className="form-row-2">
    #   <div className="form-group">...</div>
    #   <div className="form-group">...</div>
    # </div>
    # We can replace it using regex.
    # regex to match the whole block:
    # <div className="form-row-2">\s*<div className="form-group">.*?</div>\s*<div className="form-group">.*?</div>\s*</div>
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Now let's apply the motion.div correctly.
    # We want to replace <div className="form-row-2"> with <motion.div variants={itemVariants} initial="hidden" animate="visible" className="form-row-2">
    # AND the corresponding closing </div> with </motion.div>
    
    # We can find all blocks that start with <div className="form-row-2"> and end with the matching </div>.
    # Since they don't contain nested form-row-2, we can just use a non-greedy match to the next </div> that is indented at the same level, or just count divs.
    
    # Actually, simpler:
    # <div className="form-row-2">
    # (any content that doesn't contain <div className="form-row-2">)
    # </div>
    # We can just use re.sub with a function that replaces the first and last tags.
    
    def replacer(match):
        inner = match.group(1)
        # inner contains the two form-groups and their closing tags.
        # It ends with the </div> of the second form-group.
        # Wait, the match is for the whole form-row-2.
        return f'<motion.div variants={{itemVariants}} initial="hidden" whileInView="visible" viewport={{ once: true }} className="form-row-2">\n{inner}\n</motion.div>'

    # It's tricky to regex balance HTML tags.
    # Let's just use a simple string replace for the specific blocks if possible, or just build a small stack parser.
    
    # Stack parser to replace <div className="form-row-2"> ... </div> with <motion.div ...> ... </motion.div>
    tokens = re.split(r'(<div className="form-row-2">|</div>)', content)
    
    new_tokens = []
    depth = 0
    in_row = False
    row_depth = 0
    
    for token in tokens:
        if token == '<div className="form-row-2">':
            if not in_row:
                in_row = True
                row_depth = depth
                new_tokens.append('<motion.div variants={itemVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="form-row-2">')
            else:
                new_tokens.append(token)
            depth += 1
        elif token == '</div>':
            depth -= 1
            if in_row and depth == row_depth:
                in_row = False
                new_tokens.append('</motion.div>')
            else:
                new_tokens.append(token)
        else:
            # We must account for other <div... > tags inside token to keep depth accurate.
            # But wait, tokens only split on `<div className="form-row-2">` and `</div>`.
            # If there are other `<div class="something">`, they are inside the text chunk!
            # So `depth` won't track them.
            
            # Let's adjust: just count `<div` and `</div` in the whole content.
            pass

    # A better parser:
    i = 0
    out = ""
    while i < len(content):
        start = content.find('<div className="form-row-2">', i)
        if start == -1:
            out += content[i:]
            break
        
        out += content[i:start]
        out += '<motion.div variants={itemVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="form-row-2">'
        
        # Now find the matching </div>
        depth = 1
        j = start + len('<div className="form-row-2">')
        while depth > 0 and j < len(content):
            next_div = content.find('<div', j)
            next_close = content.find('</div>', j)
            
            if next_close == -1:
                break # error
                
            if next_div != -1 and next_div < next_close:
                depth += 1
                out += content[j:next_div + 4]
                j = next_div + 4
            else:
                depth -= 1
                if depth == 0:
                    out += content[j:next_close]
                    out += '</motion.div>'
                    j = next_close + 6
                else:
                    out += content[j:next_close + 6]
                    j = next_close + 6
        
        i = j

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(out)
    print(f"Fixed {filepath}")

base = r"c:/Users/ASUS/Desktop/hackX portal/hackX-portal/frontend-user/src/pages"
fix_smart(os.path.join(base, "RegisterJr.tsx"))
fix_smart(os.path.join(base, "RegisterX.tsx"))
