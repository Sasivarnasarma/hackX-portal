import re
import os

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Change CSS import
    content = content.replace("import '../components/SlidingForm.css';", "import '../components/RegistrationSplit.css';")

    # Extract stages
    s1_match = re.search(r'\{/\* STAGE 1: LEADER DETAILS \*/\}(.*?)\{/\* STAGE 3: TEAM & MEMBER DETAILS \*/\}', content, re.DOTALL)
    if not s1_match:
        # maybe it failed? Let's use a simpler regex or manual matching
        pass

    # A better way is to find the forms by ID or class. We know they are <motion.form key="stage1">
    s1_full = re.search(r'(<motion\.form[^>]*?key="stage1".*?</motion\.form>)', content, re.DOTALL)
    s2_full = re.search(r'(<motion\.form[^>]*?key="stage2".*?</motion\.form>)', content, re.DOTALL)
    s3_full = re.search(r'(<motion\.form[^>]*?key="stage3".*?</motion\.form>)', content, re.DOTALL)

    if not (s1_full and s2_full and s3_full):
        print(f"Failed to find forms in {filepath}")
        return

    stage1 = s1_full.group(1).strip()
    stage2 = s2_full.group(1).strip()
    stage3 = s3_full.group(1).strip()

    # Find the container start and end
    container_start_match = re.search(r'\{/\* Registration Container \*/\}\s*<div className="sliding-container glass-panel" style=\{\{ padding: 0 \}\}>', content)
    
    if not container_start_match:
        print(f"Failed to find container start in {filepath}")
        return
        
    start_idx = container_start_match.start()
    
    # We replace from start_idx to the end of the container
    # Since it's a huge block, we'll find the closing tag of sliding-container.
    # It ends with two AnimatePresence blocks, etc.
    # Let's search for the end of the second AnimatePresence which is in sliding-side-right, and then the closing </div>
    
    end_match = re.search(r'\</AnimatePresence\>\s*\</div\>\s*\</div\>', content[start_idx:])
    if not end_match:
        print("Failed to find end match")
        return
    end_idx = start_idx + end_match.end()

    tier = "School Tier" if "Jr" in filepath else "University Tier"
    logo = "/Logos/hackxJr-logo.webp" if "Jr" in filepath else "/Logos/hackx-logo.webp"

    new_container = f"""{{/* Registration Container */}}
          <div className="split-container">
            {{/* Left Form Column */}}
            <div className="form-column">
              <div style={{{{ textAlign: 'center', marginBottom: '2rem' }}}}>
                <h2 style={{{{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '0.04em', color: 'var(--color-text-main)' }}}}>
                  Registration
                </h2>
                <p style={{{{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.5rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}}}>
                  {tier}
                </p>
              </div>

              {{/* Progress Stepper */}}
              <div className="split-stepper">
                <div className={{`split-step ${{currentStage >= 1 ? 'active' : ''}} ${{currentStage > 1 ? 'completed' : ''}}`}}>
                  <div className="split-step-circle">{{currentStage > 1 ? <Check size={{14}} /> : '1'}}</div>
                  <span className="split-step-label">Leader</span>
                </div>
                <div className={{`split-step-divider ${{currentStage > 1 ? 'active' : ''}}`}} />
                <div className={{`split-step ${{currentStage >= 2 ? 'active' : ''}} ${{currentStage > 2 ? 'completed' : ''}}`}}>
                  <div className="split-step-circle">{{currentStage > 2 ? <Check size={{14}} /> : '2'}}</div>
                  <span className="split-step-label">Verify</span>
                </div>
                <div className={{`split-step-divider ${{currentStage > 2 ? 'active' : ''}}`}} />
                <div className={{`split-step ${{currentStage === 3 ? 'active' : ''}}`}}>
                  <div className="split-step-circle">3</div>
                  <span className="split-step-label">Team</span>
                </div>
              </div>

              {{error && (
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
                {{currentStage === 1 && (
                  {stage1}
                )}}
                {{currentStage === 2 && (
                  {stage2}
                )}}
                {{currentStage === 3 && (
                  {stage3}
                )}}
              </AnimatePresence>
            </div>

            {{/* Right Info Column */}}
            <div className="info-column">
              <div className="info-logo-container">
                <img src="{logo}" alt="hackX logo" className="info-logo" />
              </div>
              
              <div className="info-content-wrapper">
                <AnimatePresence mode="wait">
                  {{currentStage === 1 && (
                    <motion.div
                      key="info-1"
                      initial={{{{ opacity: 0, x: 20 }}}}
                      animate={{{{ opacity: 1, x: 0 }}}}
                      exit={{{{ opacity: 0, x: -20 }}}}
                      transition={{{{ duration: 0.3 }}}}
                      className="info-content"
                    >
                      <h4 className="info-step-title">Step 1: Leader Details</h4>
                      <p className="info-step-desc">
                        Enter the contact details for the team leader. Please ensure the email is correct as we will send a verification code.
                      </p>
                    </motion.div>
                  )}}
                  {{currentStage === 2 && (
                    <motion.div
                      key="info-2"
                      initial={{{{ opacity: 0, x: 20 }}}}
                      animate={{{{ opacity: 1, x: 0 }}}}
                      exit={{{{ opacity: 0, x: -20 }}}}
                      transition={{{{ duration: 0.3 }}}}
                      className="info-content"
                    >
                      <h4 className="info-step-title">Step 2: Email Verification</h4>
                      <p className="info-step-desc">
                        Check your inbox for a 6-digit OTP. We need to verify your email to ensure you receive important hackathon updates.
                      </p>
                    </motion.div>
                  )}}
                  {{currentStage === 3 && (
                    <motion.div
                      key="info-3"
                      initial={{{{ opacity: 0, x: 20 }}}}
                      animate={{{{ opacity: 1, x: 0 }}}}
                      exit={{{{ opacity: 0, x: -20 }}}}
                      transition={{{{ duration: 0.3 }}}}
                      className="info-content"
                    >
                      <h4 className="info-step-title">Step 3: Team Details</h4>
                      <p className="info-step-desc">
                        Add your team name, institution details, and register the rest of your team members (up to 5 total).
                      </p>
                    </motion.div>
                  )}}
                </AnimatePresence>
              </div>
            </div>
          </div>"""

    new_content = content[:start_idx] + new_container + content[end_idx:]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Successfully processed {filepath}")

base = r"c:/Users/ASUS/Desktop/hackX portal/hackX-portal/frontend-user/src/pages"
process_file(os.path.join(base, "RegisterJr.tsx"))
process_file(os.path.join(base, "RegisterX.tsx"))
