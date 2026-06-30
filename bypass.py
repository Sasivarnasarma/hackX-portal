import re
import os

def bypass_validations(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Bypass validateStage1
    content = re.sub(
        r'(const validateStage1 = \(\) => \{)',
        r'\1\n    return true; // TESTING BYPASS\n',
        content
    )

    # Bypass validateStage3 or validateFinalStage
    content = re.sub(
        r'(const validate(?:Stage3|FinalStage) = \(\) => \{)',
        r'\1\n    return true; // TESTING BYPASS\n',
        content
    )

    # Bypass handleSendOTP
    content = re.sub(
        r'(const handleSendOTP = async \(e: React\.FormEvent\) => \{\n    e\.preventDefault\(\);\n    setError\(null\);\n    if \(!validateStage1\(\)\) return;)',
        r'\1\n    setCurrentStage(2); return; // TESTING BYPASS\n',
        content
    )

    # Bypass handleVerifyOTP
    content = re.sub(
        r'(const handleVerifyOTP = async \(e: React\.FormEvent\) => \{\n    e\.preventDefault\(\);\n    setError\(null\);)',
        r'\1\n    setCurrentStage(3); return; // TESTING BYPASS\n',
        content
    )

    # Bypass handleFinalSubmit
    category = "'hackX Jr'" if "Jr" in filepath else "'hackX'"
    route = "'/success'"
    content = re.sub(
        r'(const handleFinalSubmit = async \(e: React\.FormEvent\) => \{\n    e\.preventDefault\(\);\n    setError\(null\);\n    if \(!validate(?:Stage3|FinalStage)\(\)\) return;)',
        rf"\1\n    navigate({route}, {{ state: {{ teamName: teamName || 'Test Team', category: {category} }} }}); return; // TESTING BYPASS\n",
        content
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Bypassed validations in {filepath}")

base = r"c:/Users/ASUS/Desktop/hackX portal/hackX-portal/frontend-user/src/pages"
bypass_validations(os.path.join(base, "RegisterJr.tsx"))
bypass_validations(os.path.join(base, "RegisterX.tsx"))
