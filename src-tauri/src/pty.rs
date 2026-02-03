use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;
use std::thread;
use tauri::{AppHandle, Emitter};

// Store active PTY sessions
lazy_static::lazy_static! {
    static ref PTY_SESSIONS: Mutex<HashMap<String, PtySession>> = Mutex::new(HashMap::new());
}

struct PtySession {
    writer: Box<dyn Write + Send>,
    child: Box<dyn portable_pty::Child + Send>,
    master: Box<dyn portable_pty::MasterPty + Send>,
}

#[derive(Clone, Serialize)]
struct PtyData {
    session_id: String,
    data: String,
}

#[derive(Clone, Serialize)]
struct PtyExit {
    session_id: String,
    code: i32,
}

#[tauri::command]
pub async fn spawn_pty(
    app: AppHandle,
    session_id: String,
    cwd: String,
) -> Result<(), String> {
    let pty_system = native_pty_system();

    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    // Spawn the claude CLI
    let mut cmd = CommandBuilder::new("claude");
    cmd.cwd(&cwd);

    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;

    // Get writer for input
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    // Get reader for output
    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;

    // Store the session
    {
        let mut sessions = PTY_SESSIONS.lock().unwrap();
        sessions.insert(
            session_id.clone(),
            PtySession {
                writer,
                child,
                master: pair.master,
            },
        );
    }

    // Spawn a thread to read PTY output
    let app_clone = app.clone();
    let session_id_clone = session_id.clone();
    thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app_clone.emit(
                        "pty-data",
                        PtyData {
                            session_id: session_id_clone.clone(),
                            data,
                        },
                    );
                }
                Err(_) => break,
            }
        }

        // Process exited, get exit code
        let exit_code = {
            let mut sessions = PTY_SESSIONS.lock().unwrap();
            if let Some(mut session) = sessions.remove(&session_id_clone) {
                session
                    .child
                    .wait()
                    .map(|status| status.exit_code() as i32)
                    .unwrap_or(-1)
            } else {
                -1
            }
        };

        let _ = app_clone.emit(
            "pty-exit",
            PtyExit {
                session_id: session_id_clone,
                code: exit_code,
            },
        );
    });

    Ok(())
}

#[tauri::command]
pub fn write_pty(session_id: String, data: String) -> Result<(), String> {
    let mut sessions = PTY_SESSIONS.lock().unwrap();
    if let Some(session) = sessions.get_mut(&session_id) {
        session
            .writer
            .write_all(data.as_bytes())
            .map_err(|e| e.to_string())?;
        session.writer.flush().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}

#[tauri::command]
pub fn resize_pty(session_id: String, cols: u16, rows: u16) -> Result<(), String> {
    let sessions = PTY_SESSIONS.lock().unwrap();
    if let Some(session) = sessions.get(&session_id) {
        session
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}

#[tauri::command]
pub fn kill_pty(session_id: String) -> Result<(), String> {
    let mut sessions = PTY_SESSIONS.lock().unwrap();
    if let Some(mut session) = sessions.remove(&session_id) {
        session.child.kill().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}
