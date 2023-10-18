let scrapeNames = document.getElementById('scrapeNames');
let downloadData = document.getElementById('downloadCSV');
let clearStorageBtn = document.getElementById('clearStorage');
let emailFormatLabel = document.getElementById('emailFormatLabel');
let downloadFormatButton = document.getElementById('downloadFormatButton');
let generateEmailsButton = document.getElementById('generateEmailsButton');

generateEmailsButton.addEventListener('click', function() {
    document.getElementById('emailFormatDropdown').style.display = 'inline-block';
    document.getElementById('downloadFormatButton').style.display = 'inline-block';
    document.getElementById('selectPrompt').classList.remove('hidden');
    document.getElementById('domainInput').style.display = 'inline-block'; // Add this line
    
    checkEnableDownloadButton();
});

document.getElementById('emailFormatDropdown').addEventListener('change', function() {
    const selectedValue = this.value;
    
    if (selectedValue !== 'default') {
        document.getElementById('selectPrompt').classList.add('hidden');
    } else {
        document.getElementById('selectPrompt').classList.remove('hidden');
    }

    checkEnableDownloadButton();
});

downloadFormatButton.addEventListener('click', async () => {
    generateEmails()
    downloadEmailsCSV()
});

document.getElementById('domainInput').addEventListener('input', checkEnableDownloadButton);
function checkEnableDownloadButton() {
    const domainValue = document.getElementById('domainInput').value;
    const formatValue = document.getElementById('emailFormatDropdown').value;
    const downloadButton = document.getElementById('downloadFormatButton');
    const domainWarning = document.getElementById('domainWarning');

    // Check if both domain and format are set
    if (domainValue.trim() !== "" && formatValue !== 'default') {
        downloadButton.classList.remove('disabled-button'); // Remove disabled style
        downloadButton.disabled = false;
        domainWarning.classList.add('hidden');  // Hide warning
    } else {
        downloadButton.classList.add('disabled-button'); // Add disabled style
        downloadButton.disabled = true;
        
        // Show the warning only if the domain is missing
        if(domainValue.trim() === "") {
            domainWarning.classList.remove('hidden');  // Show warning
        } else {
            domainWarning.classList.add('hidden');  // Hide warning
        }
    }
}

downloadData.addEventListener('click', downloadCSV)
generateEmailsButton.addEventListener('click', async () => {
    generateEmailsButton.style.display = 'none';
    emailFormatDropdown.classList.remove('hidden');
    downloadFormatButton.classList.remove('hidden');
    // emailFormatLabel.classList.remove('hidden');

})

scrapeNames.addEventListener("click", async () => {
    // alert('test')

    // Get current active tab
    let [tab] = await chrome.tabs.query({active: true, currentWindow: true});

    // Execute script to get names
    chrome.scripting.executeScript({
        target: {tabId: tab.id},
        func: extract,
    });
})


// scrapeNames.addEventListener("click", async () => {
//     // Get current active tab
//     let [tab] = await chrome.tabs.query({active: true, currentWindow: true});

//     // Inject content.js first
//     chrome.scripting.executeScript({
//         target: {tabId: tab.id},
//         files: ["content.js"]
//     }, () => {
//         // Check if there was any error
//         if (chrome.runtime.lastError) {
//             console.error(chrome.runtime.lastError);
//             return;
//         }

//         // Then call the extract function
//         chrome.scripting.executeScript({
//             target: {tabId: tab.id},
//             code: 'extract();'  // Directly calling the extract function
//         });
//     });
// });

function isLinkedInProfileURL(url) {
    const regex = /https:\/\/www\.linkedin\.com\/in\/[^/?]+/;
    return regex.test(url);
}

function extract() {
    // Get all the 'div.entity-result__item' elements
    const entityResults = Array.from(document.getElementsByClassName('entity-result__item'));
    
    // Array to store the extracted information
    const extractedData = [];
  
    entityResults.forEach(entity => {
        // Initialize the extracted data object
        let data = {
            name: null,
            title: null,
            employer: null,
            profileLink: null
        };
        
        // Extract the LinkedIn profile link
        const linkElement = entity.querySelector('.app-aware-link');
        const spanElement = entity.querySelector('span[aria-hidden="true"]');
        
        if (linkElement && spanElement) {
            data.profileLink = linkElement.href.split('?')[0].replace(/,/g, '|');
            data.name = spanElement.textContent.trim().replace(/,/g, '|');
        } else {
            console.log('Necessary HTML elements are missing.');
        }
        
        // Extract the title and employer
        const titleElement = entity.querySelector('.entity-result__primary-subtitle');
        if (titleElement) {
            const fullTitle = titleElement.textContent.trim().replace(/,/g, '|');
            const splitTitle = fullTitle.split(' at ');
            data.title = splitTitle[0];
            data.employer = splitTitle[1] || null;  // Assign null if there's no employer data
        }
        
        extractedData.push(data);
        // alert('Extracted names')
    });
  
    // Log the extracted data
    console.log(extractedData);
    // After extracting the data
    chrome.storage.local.get('scrapedData', (data) => {
        let allData = data.scrapedData || [];
    allData = allData.concat(extractedData);
    // document.getElementById('savedCount').textContent = allData.length;

    chrome.storage.local.set({ scrapedData: allData }, () => {
        if (Array.isArray(allData)) {
            console.log(`Total number of individuals saved: ${allData.length}`);
        } else {
            console.error("Unexpected data type for 'allData'. Expected an array, but got:", typeof allData);
        }  
    });
});
    
}

function isValidNameFormat(name) {
    // This regular expression checks for two words separated by a single space
    const regex = /^[a-zA-Z]+\s[a-zA-Z]+$/;
    return regex.test(name);
}

// Updated function with more email formats
function generateEmailFromName(name, format, domain) {
    const [firstName, lastName] = name.split(' ');

    switch (format) {
        case 'f.l':
            return `${firstName.charAt(0)}${lastName}@${domain}`;
        case 'fname.lname':
            return `${firstName}.${lastName}@${domain}`;
        case 'fnamelname':
            return `${firstName}${lastName}@${domain}`;
        // Add more formats as needed
        default:
            return '';
    }
}

function generateEmails() {
    let domain = document.getElementById('domainInput').value;
    // alert('generating emails')
    chrome.storage.local.get('scrapedData', (data) => {
        console.log(data)
        if (data.scrapedData && Array.isArray(data.scrapedData)) {
            let format = emailFormatDropdown.value;
            alert(format)
            let emails = data.scrapedData.map(item => {
                // Check if the name format is valid before processing
                if (item.name && isValidNameFormat(item.name)) {
                    console.log('Valid: ' + item.name)
                    return generateEmailFromName(item.name, format, domain);
                }
                console.log('Not valid: ' + item.name)
                return null;
            }).filter(email => email);  // filters out null emails

            // For now, simply log the emails
            console.log(emails);

            // Save emails back to storage if needed
            chrome.storage.local.set({ generatedEmails: emails }, () => {
                console.log(`Generated emails saved: ${emails.length}`);
            });
        }
    });
}

function downloadEmailsCSV() {
    chrome.storage.local.get(['scrapedData', 'generatedEmails'], (data) => {
        if (data.scrapedData && Array.isArray(data.scrapedData) && data.generatedEmails && Array.isArray(data.generatedEmails)) {
            
            let csvContent = "data:text/csv;charset=utf-8,";
            // let header = ["name", "generated_email"];
            // csvContent += header.join(",") + "\r\n";

            data.scrapedData.forEach((item, index) => {
                // Ensure name format is valid and there's a generated email for this name
                if (item.name && isValidNameFormat(item.name) && data.generatedEmails[index]) {
                    let row = data.generatedEmails[index];
                    csvContent += row + "\r\n";
                }
            });

            const encodedUri = encodeURI(csvContent);
            chrome.downloads.download({
                url: encodedUri,
                filename: "generatedEmails.csv",
                saveAs: true
            });
        }
    });
}

  
function downloadCSV() {
    chrome.storage.local.get('scrapedData', (data) => {
        let csvContent = "data:text/csv;charset=utf-8,";
        let header = ["member_id","name", "title", "employer", "profileLink"];
        csvContent += header.join(",") + "\r\n";

        data.scrapedData.forEach(item => {
            let row = [item.memberid, item.name, item.title, item.employer, item.profileLink];
            csvContent += row.join(",") + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        chrome.downloads.download({
            url: encodedUri,
            filename: "scrapedData.csv",
            saveAs: true
        });
    });
}

clearStorageBtn.addEventListener('click', () => {
    chrome.storage.local.clear(() => {
        let error = chrome.runtime.lastError;
        if (error) {
            console.error(error);
        } else {
            console.log('Local storage cleared!');
            alert('Local storage cleared!');
        }
    });
});

// Update the count when the popup is opened
chrome.storage.local.get('scrapedData', (data) => {
    if (data.scrapedData && Array.isArray(data.scrapedData)) {
        document.getElementById('savedCount').textContent = data.scrapedData.length;
    } else {
        document.getElementById('savedCount').textContent = "0";
    }
});
