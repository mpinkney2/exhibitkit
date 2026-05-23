import os
import re
from tkinter import Tk, filedialog

def standardize_filename(filename):
    base = filename.replace(".pdf", "").strip()

    # Primary parser: structured DOD-style
    match = re.match(r"(DOD|DOC)?\s*-\s*(\d+[\-\w]*)\s*-\s*(\d{4})?\s*-\s*([^–-]+)\s*[-–]\s*(.+)", base)
    if match:
        prefix = match.group(1) or "DOC"
        doc_id = match.group(2).strip()
        year = match.group(3) or "n.d."
        authors = match.group(4).strip().replace(",", "")
        title = match.group(5).strip().replace("  ", " ")

        return f"{prefix} - {doc_id} - {year} - {authors} - {title}.pdf"

    # Fallback parser: [Author] [Year] [Title]
    fallback = re.match(r"([A-Z][a-zA-Z]+)[\s_,-]+(19\d{2}|20\d{2})[\s_.-]+(.+)", base)
    if fallback:
        author = fallback.group(1)
        year = fallback.group(2)
        title = fallback.group(3).strip().replace("  ", " ").replace("–", "-")
        title = re.sub(r'[^\w\s\-]', '', title)  # Clean stray punctuation

        return f"{author} - {year} - {title}.pdf"

    print(f"❌ Could not parse: {filename}")
    return None

def rename_files_in_folder(folder_path):
    for filename in os.listdir(folder_path):
        if filename.endswith(".pdf"):
            original_path = os.path.join(folder_path, filename)
            new_name = standardize_filename(filename)
            if new_name:
                new_path = os.path.join(folder_path, new_name)
                os.rename(original_path, new_path)
                print(f"✅ Renamed:\n  FROM: {filename}\n  TO:   {new_name}\n")

if __name__ == "__main__":
    # Launch folder picker
    Tk().withdraw()
    folder = filedialog.askdirectory(title="Select Folder Containing PDF Files")
    if folder:
        rename_files_in_folder(folder)
    else:
        print("❗ No folder selected. Exiting.")