window.onload = function() {
    extract()
}

// I would like to find a better way
// currently triggers several times per page loaded
function showAlertForDOMChanges() {
    // alert('Content has changed!');
    extract()
}

// Initialize a new MutationObserver
const observer = new MutationObserver((mutationsList, observer) => {
    for(let mutation of mutationsList) {
        // Check if addedNodes property has one or more nodes
        if(mutation.addedNodes.length) {
            showAlertForDOMChanges();
            break;  // exit loop after showing alert once per change set
        }
    }
});

// Start observing the document with the configured parameters
observer.observe(document, { childList: true, subtree: true });

function dataExists(dataObject, dataArray) {
    return dataArray.some(item => item.profileLink === dataObject.profileLink);
}

function extract() {
    // Get all the 'div.entity-result__item' elements
    const entityResults = Array.from(document.getElementsByClassName('entity-result'));
    // console.log('Original: ' +  entityResults);
    // Array to store the extracted information
    const extractedData = [];
  
    entityResults.forEach(entity => {
        // Initialize the extracted data object
        let data = {
            memberid: null,
            name: null,
            title: null,
            employer: null,
            profileLink: null
        };
        
        // Extract the member ID from the data-chameleon-result-urn attribute
        if (entity && entity.hasAttribute('data-chameleon-result-urn')) {
            const urnValue = entity.getAttribute('data-chameleon-result-urn');
            const memberId = urnValue.split(':').pop();
            // console.log(memberId);
            data.memberid = memberId;
        } else {
            console.error('Member ID not found.');
            // return null;
    }

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
            data.title = splitTitle[0] || null;
            data.employer = splitTitle[1] || null;  // Assign null if there's no employer data
        }
        
        extractedData.push(data);
    });

    // Log the extracted data
    console.log(extractedData);

    // Get the current stored data
    chrome.storage.local.get('scrapedData', (data) => {
        let allData = data.scrapedData || [];
        
        // Add the new extracted data if it doesn't already exist in storage
        extractedData.forEach(dataItem => {
            if (!dataExists(dataItem, allData)) {
                allData.push(dataItem);
                console.log("Adding user to db: " + dataItem.name);
            } else {
                
                console.log("User already in db: " + dataItem.name);
            }
        });
    
        // Update the storage with the merged data
        chrome.storage.local.set({ scrapedData: allData }, () => {
            if (Array.isArray(allData)) {
                console.log(`Total number of individuals saved: ${allData.length}`);
            } else {
                console.error("Unexpected data type for 'allData'. Expected an array, but got:", typeof allData);
            }  
        });
    
        // Send a message about the extracted data
        chrome.runtime.sendMessage({ type: 'DATA_EXTRACTED', data: extractedData }, (response) => {
            console.log(response);
        });
    });
}
