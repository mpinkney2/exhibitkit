import os
import re
from tkinter import Tk, filedialog

def rename_files_in_folder(folder_path):
    for filename in os.listdir(folder_path):
        if filename.endswith(".pdf"):
            original = filename
            new_name = standardize_filename(filename)
            if new_name:
                old_path = os.path.join(folder_path, filename)
                new_path = os.path.join(folder_path, new_name)
                os.rename(old_path, new_path)
                print(f"Renamed:\n  FROM: {filename}\n  TO:   {new_name}\n")

def standardize_filename(filename):
    base = filename.replace(".pdf", "").strip()

    match = re.match(r"(DOD|DOC)?\s*-\s*(\d+[\-\w]*)\s*-\s*(\d{4})?\s*-\s*([^–-]+)\s*[-–]\s*(.+)", base)
    if match:
        prefix = match.group(1) or "DOC"
        doc_id = match.group(2).strip()
        year = match.group(3) or "n.d."
        authors = match.group(4).strip().replace(",", "")
        title = match.group(5).strip().replace("  ", " ")

        new_filename = f"{prefix} - {doc_id} - {year} - {authors} - {title}.pdf"
        return new_filename
    else:
        print(f"❌ Could not parse: {filename}")
        return None

if __name__ == "__main__":
    Tk().withdraw()  # Hide root window
    folder = filedialog.askdirectory(title="Select Folder with Patent PDFs")
    if folder:
        rename_files_in_folder(folder)