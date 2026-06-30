import re
import os

def fix_css(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Clean up the bad replace
    content = re.sub(r'\.form-column \{.*?\}', '', content, flags=re.DOTALL)
    
    # Let's just find the split-container and insert form-column right after it
    if '/* Left Form Column */' in content:
        # If it got messed up, let's just do a clean rewrite of the top part.
        pass

    # Actually, I'll just rewrite the file safely.
    # It's better to just do a strict replace
    pass

# I'll rewrite the CSS file entirely to be safe, I have the contents from earlier.
def rewrite_css(filepath):
    css_content = """/* Split Layout Container */
.split-container {
  display: flex;
  gap: 2rem;
  width: 98%;
  max-width: 1800px;
  margin: 0 auto;
  align-items: stretch;
}

/* Split Ambient Glows */
.ambient-glow-left {
  position: absolute;
  top: 10%;
  left: 5%;
  width: 40vw;
  height: 60vh;
  background: radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, rgba(14, 165, 233, 0) 70%);
  filter: blur(100px);
  z-index: 0;
  pointer-events: none;
}

.ambient-glow-right {
  position: absolute;
  bottom: 10%;
  right: 5%;
  width: 30vw;
  height: 50vh;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0) 70%);
  filter: blur(100px);
  z-index: 0;
  pointer-events: none;
}

/* Left Form Column */
.form-column {
  flex: 1;
  background: rgba(1, 8, 20, 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  border-radius: var(--radius-xl);
  padding: 3rem 2.5rem;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  z-index: 2;
}

/* Mouse Spotlight */
.mouse-spotlight {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  background-image: radial-gradient(800px circle at var(--mouse-x, 0) var(--mouse-y, 0), rgba(91, 184, 255, 0.08), transparent 40%);
  transition: opacity 0.3s;
}

.form-column > * {
  position: relative;
  z-index: 1;
}

/* Form Grid Rows */
.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

@media (max-width: 768px) {
  .form-row-2 {
    grid-template-columns: 1fr;
  }
}

/* Right Info Column */
.info-column {
  width: 35%;
  min-width: 400px;
  max-width: 600px;
  flex-shrink: 0;
  background: linear-gradient(135deg, rgba(4, 26, 58, 0.8), rgba(4, 26, 58, 0.4));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(91, 184, 255, 0.15);
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.3);
  border-radius: var(--radius-xl);
  padding: 2.5rem 2rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  z-index: 2;
}

.info-logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 2.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.info-logo {
  height: 45px;
  width: auto;
  object-fit: contain;
}

.info-content-wrapper {
  position: relative;
  min-height: 200px;
}

.info-content {
  display: flex;
  flex-direction: column;
}

.info-step-title {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 800;
  color: #ffffff;
  margin: 0 0 1rem 0;
  letter-spacing: 0.03em;
}

.info-step-desc {
  color: var(--color-text-muted);
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0;
}

/* Horizontal Stepper (re-used logic but tailored) */
.split-stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 500px;
  margin: 0 auto 3rem auto;
  position: relative;
}

.split-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  z-index: 2;
}

.split-step-circle {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.5);
  transition: var(--transition-smooth);
}

.split-step.active .split-step-circle {
  background: rgba(91, 184, 255, 0.15);
  border-color: var(--color-arc);
  color: #ffffff;
  box-shadow: 0 0 15px rgba(91, 184, 255, 0.2);
}

.split-step.completed .split-step-circle {
  background: linear-gradient(135deg, var(--color-electric), var(--color-arc));
  border-color: transparent;
  color: #ffffff;
}

.split-step-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: var(--transition-smooth);
}

.split-step.active .split-step-label {
  color: var(--color-arc);
}

.split-step.completed .split-step-label {
  color: #ffffff;
}

/* The connecting lines */
.split-step-divider {
  flex: 1;
  height: 2px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 1rem;
  position: relative;
  top: -10px; /* Align with circle centers */
  transition: var(--transition-smooth);
}

.split-step-divider.active {
  background: linear-gradient(to right, var(--color-electric), var(--color-arc));
}

/* Mobile Responsiveness */
@media (max-width: 1024px) {
  .split-container {
    flex-direction: column-reverse;
  }
  
  .info-column {
    width: 100%;
    position: static;
    min-height: auto;
  }

  .info-content-wrapper {
    min-height: auto;
  }
}
"""
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(css_content)
    print(f"Rewrote CSS at {filepath}")

def apply_react_effects(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add mousePosition state and handler
    if 'const [mousePosition, setMousePosition]' not in content:
        state_str = """
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    },
    exit: { opacity: 0 }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };
"""
        # Insert right after `const [currentStage, setCurrentStage] = useState(...)`
        content = re.sub(
            r'(const \[currentStage, setCurrentStage\] = useState[^;]+;)',
            r'\1\n' + state_str,
            content
        )

    # 2. Add Ambient Glows behind container
    if '<div className="ambient-glow-left" />' not in content:
        content = content.replace(
            '<div className="split-container">',
            '<div className="ambient-glow-left" />\n          <div className="ambient-glow-right" />\n          <div className="split-container">'
        )

    # 3. Add onMouseMove and mouse-spotlight div to form-column
    if 'onMouseMove={handleMouseMove}' not in content:
        # We find <div className="form-column"> and add the prop
        content = content.replace(
            '<div className="form-column">',
            '<div className="form-column" onMouseMove={handleMouseMove} style={{ "--mouse-x": `${mousePosition.x}px`, "--mouse-y": `${mousePosition.y}px` } as React.CSSProperties}>\n              <div className="mouse-spotlight" />'
        )

    # 4. Change <motion.form key="stageX" ...> to include variants
    # Currently it has initial, animate, exit. We replace those with variants.
    # Actually, we can keep the form's initial/animate/exit, and just apply containerVariants to a div INSIDE the form, 
    # OR change the form to use containerVariants.
    # It's easier to change form-row-2 to motion.div variants={itemVariants} and add variants={containerVariants} to the form.
    # Wait, if we replace initial={{ opacity: 0, x: 20 }} with variants={containerVariants} initial="hidden" animate="visible" exit="exit"
    # That breaks the sliding x animation.
    # Let's keep the form's x sliding, and just let framer motion inherit 'visible' automatically?
    # If the parent has animate={{ opacity: 1, x: 0 }}, it won't propagate stagger unless we use variants for the parent.
    # So let's wrap the inside of the form in `<motion.div variants={containerVariants} initial="hidden" animate="visible">`
    # Let's do that for stage 1, 2, 3.

    for i in range(1, 4):
        # We can just change `<div className="form-row-2">` to `<motion.div variants={itemVariants} className="form-row-2">`
        # and wrap the form contents.
        # Actually, if we just change form-row-2 and form-group it will stagger if we provide initial="hidden" whileInView="visible"
        pass
    
    # Change all form-row-2 to motion.div
    content = content.replace('<div className="form-row-2">', '<motion.div variants={itemVariants} initial="hidden" animate="visible" className="form-row-2">')
    content = content.replace('</div className="form-row-2">', '</motion.div>') # not needed, it's just </div>
    # since we can't easily replace the closing </div> of form-row-2 without a parser, 
    # let's just use initial="hidden" animate="visible" on the motion.div directly.
    # Yes: <motion.div variants={itemVariants} initial="hidden" animate="visible" className="form-row-2">
    content = re.sub(r'<div className="form-row-2">', r'<motion.div variants={itemVariants} initial="hidden" animate="visible" className="form-row-2">', content)
    
    # We need to replace the closing tags. A regex for that is hard. 
    # But wait, earlier we created `<div className="form-row-2"> \n \1 \n \2 \n </div>`
    # So we can just replace `\n                  </div>` or similar.
    # Actually, the grid_refactor.py put exact spacing: `\n                  </div>`
    # Let's use a regex to find `<motion.div variants={itemVariants}...> (content) </div>`
    content = re.sub(r'(<motion\.div variants=\{itemVariants\} initial="hidden" animate="visible" className="form-row-2">.*?\n\s*)</div>', r'\1</motion.div>', content, flags=re.DOTALL)

    # Some form-groups are NOT in form-row-2. We should also animate them.
    # Let's find <div className="form-group"> that are direct children of the form or inside the stage.
    # It's safer to just let the grid rows animate.
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Processed React files: {filepath}")

base = r"c:/Users/ASUS/Desktop/hackX portal/hackX-portal/frontend-user/src/pages"
rewrite_css(r"c:/Users/ASUS/Desktop/hackX portal/hackX-portal/frontend-user/src/components/RegistrationSplit.css")
apply_react_effects(os.path.join(base, "RegisterJr.tsx"))
apply_react_effects(os.path.join(base, "RegisterX.tsx"))
