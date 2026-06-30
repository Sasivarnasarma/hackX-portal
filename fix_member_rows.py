import os

def fix_form_row(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # The members are currently wrapped in `<div className="form-row">`
    # We want to change it to `<motion.div variants={itemVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="form-row-2">`
    # and the closing `</div>` of that row to `</motion.div>`.
    
    # We can do this safely by splitting on `<div className="form-row">`
    parts = content.split('<div className="form-row">')
    if len(parts) == 1:
        return
        
    out = parts[0]
    for i in range(1, len(parts)):
        part = parts[i]
        # find the matching closing div for the form-row
        # since it's just two form-groups inside, it usually has two `</div>`s inside, and then a closing `</div>`.
        # Wait, the structure inside `<div className="form-row">` is:
        # <div className="form-group" style={{ marginBottom: '0.75rem' }}> ... </div>
        # <div className="form-group" style={{ marginBottom: '0.75rem' }}> ... </div>
        # </div>
        
        # let's just find the first `</div>` that is after the two inner ones.
        # Or we can just use `</div>\n                        </div>` if we look at the indentation!
        # Actually, let's just do a simple replace of the opening tag.
        
        # We can just change the opening tag to the new motion.div, and we will have to change the closing tag manually.
        out += '<motion.div variants={itemVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="form-row-2">'
        
        # Replace the first `</div>\n                        </div>` with `</div>\n                        </motion.div>`
        # This is safe because of the exact indentation used in the file.
        part = part.replace('</div>\n                        </div>', '</div>\n                        </motion.div>', 1)
        out += part

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(out)
    print(f"Fixed form rows in {filepath}")

base = r"c:/Users/ASUS/Desktop/hackX portal/hackX-portal/frontend-user/src/pages"
fix_form_row(os.path.join(base, "RegisterJr.tsx"))
fix_form_row(os.path.join(base, "RegisterX.tsx"))
