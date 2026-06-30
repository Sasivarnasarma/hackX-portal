import re
import os

def refactor_forms(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # The goal is to find pairs of <div className="form-group"> ... </div>
    # and wrap them in <div className="form-row-2"> ... </div>
    # But ONLY for specific sections like Stage 1, Stage 3 Leader, and Member blocks.
    # It's safer to do this by replacing specific known sequences.

    # 1. Stage 1: Name and Email
    content = re.sub(
        r'(<div className="form-group">\s*<label className="form-label" htmlFor="leaderName">Full Name</label>.*?</div>)\s*(<div className="form-group">\s*<label className="form-label" htmlFor="leaderEmail">Email Address</label>.*?</div>)',
        r'<div className="form-row-2">\n                    \1\n                    \2\n                  </div>',
        content,
        flags=re.DOTALL
    )

    # 2. Stage 1: Phone and DOB (Jr) or NIC (X)
    content = re.sub(
        r'(<div className="form-group">\s*<label className="form-label" htmlFor="leaderPhone">Phone Number</label>.*?</div>)\s*(<div className="form-group">\s*<label className="form-label" htmlFor="(leaderDob|leaderNic)">(Date of Birth|NIC Number)</label>.*?</div>)',
        r'<div className="form-row-2">\n                    \1\n                    \2\n                  </div>',
        content,
        flags=re.DOTALL
    )
    
    # 3. Stage 3: Team Name and School/University
    content = re.sub(
        r'(<div className="form-group">\s*<label className="form-label" htmlFor="teamName">Team Name</label>.*?</div>)\s*(<div className="form-group">\s*<label className="form-label" htmlFor="(schoolName|university)">(School Name|University / Institution)</label>.*?</div>)',
        r'<div className="form-row-2">\n                    \1\n                    \2\n                  </div>',
        content,
        flags=re.DOTALL
    )

    # 4. Stage 3: Teacher Name and Teacher Phone (Jr)
    content = re.sub(
        r'(<div className="form-group">\s*<label className="form-label" htmlFor="teacherName">Teacher\'s Name.*?</div>)\s*(<div className="form-group">\s*<label className="form-label" htmlFor="teacherPhone">Teacher\'s Phone.*?</div>)',
        r'<div className="form-row-2">\n                    \1\n                    \2\n                  </div>',
        content,
        flags=re.DOTALL
    )

    # 5. Members array: Name and Email
    content = re.sub(
        r'(<div className="form-group">\s*<label className="form-label">Full Name</label>.*?</div>)\s*(<div className="form-group">\s*<label className="form-label">Email Address</label>.*?</div>)',
        r'<div className="form-row-2">\n                          \1\n                          \2\n                        </div>',
        content,
        flags=re.DOTALL
    )

    # 6. Members array: Phone and DOB/NIC
    content = re.sub(
        r'(<div className="form-group">\s*<label className="form-label">Phone Number</label>.*?</div>)\s*(<div className="form-group">\s*<label className="form-label">(Date of Birth|NIC Number)</label>.*?</div>)',
        r'<div className="form-row-2">\n                          \1\n                          \2\n                        </div>',
        content,
        flags=re.DOTALL
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Processed {filepath}")

base = r"c:/Users/ASUS/Desktop/hackX portal/hackX-portal/frontend-user/src/pages"
refactor_forms(os.path.join(base, "RegisterJr.tsx"))
refactor_forms(os.path.join(base, "RegisterX.tsx"))
