import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add SlidingForm.css import
    if "import '../components/SlidingForm.css';" not in content:
        content = content.replace("import '../components/OceanBackground';", "import '../components/OceanBackground';\nimport '../components/SlidingForm.css';")

    # Extract stages
    s1_match = re.search(r'\{/\* STAGE 1: LEADER DETAILS \*/\}(.*?)\{/\* STAGE 2: OTP VERIFICATION \*/\}', content, re.DOTALL)
    s2_match = re.search(r'\{/\* STAGE 2: OTP VERIFICATION \*/\}(.*?)\{/\* STAGE 3: TEAM & MEMBER DETAILS \*/\}', content, re.DOTALL)
    s3_match = re.search(r'\{/\* STAGE 3: TEAM & MEMBER DETAILS \*/\}(.*?)\</AnimatePresence\>', content, re.DOTALL)

    if not (s1_match and s2_match and s3_match):
        print(f"Failed to find stages in {filepath}")
        return

    stage1 = s1_match.group(1).strip()
    stage2 = s2_match.group(1).strip()
    stage3 = s3_match.group(1).strip()

    # Find the container start and end
    container_start_match = re.search(r'\{/\* Registration Container \*/\}\s*<div className="glass-panel" style=\{\{ padding: \'2\.5rem 2rem\', position: \'relative\', borderRadius: \'var\(--radius-xl\)\' \}\}>', content)
    
    if not container_start_match:
        print(f"Failed to find container start in {filepath}")
        return
        
    start_idx = container_start_match.start()
    
    # We replace from start_idx to the end of the container
    end_match = re.search(r'\</AnimatePresence\>\s*\</div\>', content[start_idx:])
    end_idx = start_idx + end_match.end()

    # Determine Tier text based on filepath
    tier = "School Tier" if "Jr" in filepath else "University Tier"
    logo = "/Logos/hackxJr-logo.webp" if "Jr" in filepath else "/Logos/hackx-logo.webp"

    new_container = f"""{{/* Registration Container */}}
          <div className="sliding-container glass-panel" style={{{{ padding: 0 }}}}>
            {{/* The Overlay */}}
            <motion.div
              className="sliding-overlay"
              animate={{{{ x: currentStage === 2 ? '0%' : '100%' }}}}
              transition={{{{ type: 'spring', stiffness: 250, damping: 25 }}}}
            >
              <div className="sliding-overlay-content">
                <img src="{logo}" alt="logo" style={{{{ height: '40px', width: 'auto', marginBottom: '0.5rem' }}}} />
                <h3 className="sliding-overlay-title">Registration Progress</h3>
                <p className="sliding-overlay-subtitle">Complete all steps to secure your spot</p>
                
                <div className="overlay-stepper">
                  <div className={{`overlay-step ${{currentStage >= 1 ? 'active' : ''}} ${{currentStage > 1 ? 'completed' : ''}}`}}>
                    <div className="overlay-step-circle">{{currentStage > 1 ? <Check size={{14}} /> : '1'}}</div>
                    <span className="overlay-step-label">Leader</span>
                  </div>
                  <div className={{`overlay-step ${{currentStage >= 2 ? 'active' : ''}} ${{currentStage > 2 ? 'completed' : ''}}`}}>
                    <div className="overlay-step-circle">{{currentStage > 2 ? <Check size={{14}} /> : '2'}}</div>
                    <span className="overlay-step-label">Verify</span>
                  </div>
                  <div className={{`overlay-step ${{currentStage === 3 ? 'active' : ''}}`}}>
                    <div className="overlay-step-circle">3</div>
                    <span className="overlay-step-label">Team</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {{/* Left Side (Stages 1 and 3) */}}
            <div className="sliding-side sliding-side-left">
              <div style={{{{ textAlign: 'center', marginBottom: '1.5rem', opacity: currentStage === 2 ? 0 : 1, transition: 'opacity 0.3s' }}}}>
                <h2 style={{{{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800, margin: 0, letterSpacing: '0.04em', color: 'var(--color-text-main)' }}}}>
                  Registration
                </h2>
                <p style={{{{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.5rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}}}>
                  {tier}
                </p>
              </div>

              {{error && currentStage !== 2 && (
                <motion.div
                  initial={{{{ opacity: 0, y: -10 }}}}
                  animate={{{{ opacity: 1, y: 0 }}}}
                  style={{{{ background: 'rgba(255, 107, 107, 0.1)', border: '1px solid #ff6b6b', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ff6b6b' }}}}
                >
                  <AlertCircle size={{20}} style={{{{ flexShrink: 0 }}}} />
                  <span style={{{{ fontSize: '0.875rem', textAlign: 'left', whiteSpace: 'pre-line' }}}}>{{error}}</span>
                </motion.div>
              )}}

              <AnimatePresence mode="wait">
                {{/* STAGE 1: LEADER DETAILS */}}
                {stage1}
                {{/* STAGE 3: TEAM & MEMBER DETAILS */}}
                {stage3}
              </AnimatePresence>
            </div>

            {{/* Right Side (Stage 2) */}}
            <div className="sliding-side sliding-side-right">
              <div style={{{{ textAlign: 'center', marginBottom: '1.5rem', opacity: currentStage !== 2 ? 0 : 1, transition: 'opacity 0.3s' }}}}>
                <h2 style={{{{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800, margin: 0, letterSpacing: '0.04em', color: 'var(--color-text-main)' }}}}>
                  Registration
                </h2>
                <p style={{{{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.5rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}}}>
                  {tier}
                </p>
              </div>

              {{error && currentStage === 2 && (
                <motion.div
                  initial={{{{ opacity: 0, y: -10 }}}}
                  animate={{{{ opacity: 1, y: 0 }}}}
                  style={{{{ background: 'rgba(255, 107, 107, 0.1)', border: '1px solid #ff6b6b', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ff6b6b' }}}}
                >
                  <AlertCircle size={{20}} style={{{{ flexShrink: 0 }}}} />
                  <span style={{{{ fontSize: '0.875rem', textAlign: 'left', whiteSpace: 'pre-line' }}}}>{{error}}</span>
                </motion.div>
              )}}

              <AnimatePresence mode="wait">
                {{/* STAGE 2: OTP VERIFICATION */}}
                {stage2}
              </AnimatePresence>
            </div>
          </div>"""

    new_content = content[:start_idx] + new_container + content[end_idx:]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Successfully processed {filepath}")

import os
base = r"c:/Users/ASUS/Desktop/hackX portal/hackX-portal/frontend-user/src/pages"
process_file(os.path.join(base, "RegisterJr.tsx"))
process_file(os.path.join(base, "RegisterX.tsx"))
