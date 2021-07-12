# seniormap
An interactive map of GMHS seniors' college/postsecondary destinations.  Created by Erik Boesen (GMHS Class of 2019), the map is now maintained by the GMHS Advanced Programming Club. If you'd like to make a submission, please visit [the map](https://apc-gm.com/seniormap) and click on the form in the bottom left corner.

## Maintainence instructions 
### Creating the form and spreadsheet for a new year

1. Navigate to the ['Senior Map' folder](https://drive.google.com/drive/folders/1Jko-Gei3H9em6nXjL_Tia8j4NNptmD6k) on Google Drive and create a new folder with the year of the graduating class (e.g. 2027). Request access to the folder if you do not already have access.
2. Make a copy of a previous year's form and edit content accordingly for the appropriate year.
3. Ensure the form has a linked Google spreadsheet with the appropriate fields.
![Screenshot of creating linked spreadsheet](resources/readme/create_linked_sheet.png)
4. Publish the spreadsheet to the web (File > Publish to the web; link will then be provided).
5. Add the [Trimmer.gs script](resources/tools/Trimmer.gs) to the spreadsheet (Tools > Script Editor > paste in).
6. Save the code, then click "Select Code Function" and choose "installTriggers." Then click the play button.

### Adding the new year to the code base

1. Within `js/scripts.js`, search for "README FLAG" and follow the instructions to add an entry, with the spreadsheet's datasheet URL for the appropriate year.
   - For example: `['2027', 'a8a8a8a8a8a8a8a8a8a8a8a8a8a'],`
2. Create an entry for the student submission spreadsheet you created previously in the 'Year Data' sheet (Senior Map/Shared Data/Year Data). Mimick the existing entry cells and paste the datasheet URL next to the year you created. 
3. In the same spreadsheet, create an entry for the corresponding Google form submission link in the right adjacent cell. This link appear on the map so students can submit their post-secondary destination. 
![Screenshot of 'Year Data' cells](resources/readme/year_data_sheet.png).
4. Navigate to the [Senior Map Stats Processor](https://script.google.com/d/1e7sXhj4i-caj1n9NKWWG1OcA8QSC51SULYJdCsqF82vyFqW9ESKs58U4/edit?usp=sharing) and click "Run." This will synchronize the stats script with your new Google Sheet ID from the Year Data sheet.

### Obtaining and readying senior portraits of students

1. Email the GMHS registrar, Lynette Kemp, for a list of students in your grade. The registrar is the administrator who manages student enrollment and will have this information on hand; their contact information is listed in the [GMHS staff directory](https://www.fccps.org/o/gmhs/staff?filter_id=%5B68455%5D).
2. Email the yearbook club teacher lead and ask for senior portraits for the senior map. They will share a folder with you on Google Drive containing all the portraits.
   - These images will be in alphabetical order with file names of 00001.jpeg, 00002.jpeg, etc.
   ![Screenshot of numbered senior portraits](resources/readme/shared_portraits.png)
3. Download all of the photos from Google Drive into a folder on your desktop.
4. Download the photo naming script available at [`resources/tools/namePictures.py`](resources/tools/namePictures.py).
5. Convert the spreadsheet of names into a 2D array to replace `[['firstname', 'lastname']]`.
   - For example `[['Bill', 'Axel'], ['Sally', 'Breeze'], ['Manuel','Collins']]`
   - There's a number of online tools that will do this for you, such as [this site](https://www.seabreezecomputers.com/excel2array).
6. Run the Python script, renaming all of the unnamed photos to their corresponding student names. 
   - It's important to note that both the array of names and the student photos must be aligned and set up correctly to function properly. For example if a student is present in the array, but doesn't have a photo, all of the photo's names will be off by one. Setting up the script correctly is a little bit time consuming, but far faster than manually renaming each photo.
7. Compress all pictures in that folder using the [compress.sh script](readme/tools/compress.sh) (make sure you've installed NodeJS first). Move the script into your folder with senior portraits and run:
```bash
source compress.sh
``` 
8. Create a new folder inside of the [seniormap-portraits bucket](https://console.cloud.google.com/storage/browser/seniormap-portraits;tab=objects?forceOnBucketsSortingFiltering=false&project=senior-map-277617&prefix=&forceOnObjectsSortingFiltering=false) named with the corresponding year.
9. Upload the pictures to that folder.


### Adding a new student to the map after form submission 

1. After a student submits the form, a new entry will appear in the the corresponding spreadsheet.
2. If the student appears on the map, highlight the entry in green to indicate they're visible.
3. If the student does not appear on the map, the college they are attending must be added .
   - To do this, create a new entry in 'Shared Data' (Senior Map/Shared Data/Location Information) for both the coordinates and logos subsheets.
   - Mimicking existing cells, add the coordinates, and the logo to the entries.
   ![Screenshot of coordinate cells](resources/readme/coordinates_sheet.png)
   ![Screenshot of logo cells](resources/readme/logo_sheet.png)
   - A good way to see if certain schools don't have logos is by using the developer console. The names of institutions missing logos will appear here.
   ![Screenshot of console errors](resources/readme/console_error_reporting.png)
4. After ensuring the student appears, mark them visible!

### Passing the map onto future classes 
1. Find an experienced leadership member of the APC who is a student in the next graduating class who is able and willing to take over the map.
2. Request their personal email address and transfer ownership of the Senior Map Google Cloud Project to them.
3. Give their student email account ownership of all Senior Map Google Drive folders **AND** files. They must be made an owner of **ALL** Senior Map files individually, as this prevents the files from getting removed when your own Google account is marked for deletion.
4. Give their student email account ownership of the [Senior Map Stats Processor](https://script.google.com/d/1e7sXhj4i-caj1n9NKWWG1OcA8QSC51SULYJdCsqF82vyFqW9ESKs58U4/edit?usp=sharing) Google Apps Script.
5. Make sure they can access the Senior Map GitHub repository as editor.

---

If you have any questions about the codebase/maintaining it, or adding a new class to the page, don't hesistate to reach out to past maintainers, listed below: 

- [Erik Boesen](https://github.com/ErikBoesen), Class of 2019 
- [Andrew Lester](https://github.com/AndrewLester), Class of 2021
- [Jonathan Oppenheimer](https://github.com/TheBlueness), Class of 2021

Also make sure you publicize the map to your class to carry on the tradition! Talk to your class officers about posting the map on Schoology, reach out to your college counselor about sending the map out and consider sharing the map on social media.
