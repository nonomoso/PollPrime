// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Import FHE library for handling encrypted data types (euint32, ebool)
// and the configuration for the specific network (Sepolia).
import { FHE, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title AnonymousReportPlatformFHE
 * @author Zama
 * @notice A decentralized platform for submitting anonymous reports using FHE.
 * This contract allows users to submit encrypted reports (title, content, category).
 * It can perform encrypted operations, such as counting reports per category,
 * without ever decrypting the data on-chain. Decryption is handled off-chain
 * via a request-based mechanism to protect user privacy.
 */
contract AnonymousReportPlatformFHE is SepoliaConfig {

    // --- Structs ---

    /**
     * @dev Stores the encrypted data for a single report.
     * All sensitive information remains encrypted on-chain.
     */
    struct EncryptedReport {
        uint256 id;                 // Unique identifier for the report.
        euint32 encryptedTitle;     // Encrypted title. 
        euint32 encryptedContent;   // Encrypted content. 
        euint32 encryptedCategory;  // Encrypted category. 
        uint256 timestamp;          // Submission timestamp. 
    }

    /**
     * @dev Stores the decrypted report details once they are revealed.
     * This is populated only after a successful decryption request.
     */
    struct DecryptedReport {
        string title;               // Decrypted report title. 
        string content;             // Decrypted report content.
        string category;            // Decrypted report category.
        bool isRevealed;            // Flag to check if the report has been decrypted.
    }

    // --- State Variables ---

    uint256 public reportCount; // Total number of reports submitted. 

    // Mappings to store report data.
    mapping(uint256 => EncryptedReport) public encryptedReports; // Maps report ID to its encrypted data.
    mapping(uint256 => DecryptedReport) public decryptedReports; // Maps report ID to its decrypted data.

    // Mapping to store encrypted counters for each category.
    mapping(string => euint32) private encryptedCategoryCount; // Maps a category name to its encrypted count. 
    string[] private categoryList; // A list of all categories that have been used.

    // Mapping to track decryption requests.
    mapping(uint256 => uint256) private requestToReportId; // Maps a decryption request ID to the corresponding report ID. 

    // --- Events ---

    event ReportSubmitted(uint256 indexed id, uint256 timestamp); // Emitted when a new report is submitted.
    event DecryptionRequested(uint256 indexed id); // Emitted when decryption is requested for a report.
    event ReportDecrypted(uint256 indexed id); // Emitted when a report has been successfully decrypted.

    // --- Modifiers ---

    /**
     * @dev A modifier to restrict access to certain functions.
     * In a real implementation, this should verify that msg.sender is authorized
     * (e.g., the original reporter or an authorized party).
     */
    modifier onlyReporter(uint256 reportId) { 
        // Example access control: require(msg.sender == ownerOf[reportId], "Not authorized");
        _; 
    }

    // --- Functions ---

    /**
     * @notice Submits a new encrypted report.
     * @param _encryptedTitle The encrypted title of the report.
     * @param _encryptedContent The encrypted content of the report.
     * @param _encryptedCategory The encrypted category of the report.
     */
    function submitEncryptedReport(
        euint32 _encryptedTitle,
        euint32 _encryptedContent,
        euint32 _encryptedCategory
    ) public {
        reportCount += 1;
        uint256 newId = reportCount; 

        // Store the new encrypted report.
        encryptedReports[newId] = EncryptedReport({
            id: newId,
            encryptedTitle: _encryptedTitle,
            encryptedContent: _encryptedContent,
            encryptedCategory: _encryptedCategory,
            timestamp: block.timestamp
        });

        // Initialize the decrypted state as empty and not revealed.
        decryptedReports[newId] = DecryptedReport({ 
            title: "",
            content: "",
            category: "",
            isRevealed: false
        });

        emit ReportSubmitted(newId, block.timestamp); 
    }

    /**
     * @notice Requests the decryption of a specific report's data.
     * @dev This function sends the encrypted data to the FHE precompile for decryption.
     * @param reportId The ID of the report to decrypt.
     */
    function requestReportDecryption(uint256 reportId) public onlyReporter(reportId) {
        EncryptedReport storage report = encryptedReports[reportId];
        require(!decryptedReports[reportId].isRevealed, "Report has already been decrypted."); 

        // Package the encrypted data into a bytes32 array.
        bytes32[] memory ciphertexts = new bytes32[](3);
        ciphertexts[0] = FHE.toBytes32(report.encryptedTitle); 
        ciphertexts[1] = FHE.toBytes32(report.encryptedContent);
        ciphertexts[2] = FHE.toBytes32(report.encryptedCategory);

        // Call the FHE precompile to request decryption.
        // The result will be sent to the `decryptReport` callback function.
        uint256 reqId = FHE.requestDecryption(ciphertexts, this.decryptReport.selector);
        requestToReportId[reqId] = reportId; // Link the request ID to the report ID. 

        emit DecryptionRequested(reportId);
    }

    /**
     * @notice The callback function that receives the decrypted report data.
     * @dev This function is called by the FHE precompile service. It verifies the
     * decryption proof and updates the contract state with the decrypted information.
     * @param requestId The ID of the decryption request.
     * @param cleartexts The decrypted data as a bytes array.
     * @param proof A signature proof to verify the decryption's authenticity.
     */
    function decryptReport(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        uint256 reportId = requestToReportId[requestId];
        require(reportId != 0, "Invalid decryption request ID."); 

        DecryptedReport storage dReport = decryptedReports[reportId];
        require(!dReport.isRevealed, "Report has already been decrypted.");

        // Verify the decryption signature proof.
        FHE.checkSignatures(requestId, cleartexts, proof); 

        // Decode the cleartext results.
        string[] memory results = abi.decode(cleartexts, (string[]));

        // Update the state with the decrypted data.
        dReport.title = results[0]; 
        dReport.content = results[1];
        dReport.category = results[2];
        dReport.isRevealed = true;

        // FHE Operation: Increment the encrypted counter for this category.
        // If the category is new, initialize its counter.
        if (FHE.isInitialized(encryptedCategoryCount[dReport.category]) == false) {
            encryptedCategoryCount[dReport.category] = FHE.asEuint32(0);
            categoryList.push(dReport.category); 
        }
        // Perform encrypted addition: new_count = old_count + 1
        encryptedCategoryCount[dReport.category] = FHE.add(
            encryptedCategoryCount[dReport.category],
            FHE.asEuint32(1)
        );

        emit ReportDecrypted(reportId); 
    }

    /**
     * @notice Gets the decrypted details of a report.
     * @param reportId The ID of the report.
     * @return title The decrypted title.
     * @return content The decrypted content.
     * @return category The decrypted category.
     * @return isRevealed A boolean indicating if the report has been revealed.
     */
    function getDecryptedReport(uint256 reportId) public view returns (
        string memory title,
        string memory content,
        string memory category,
        bool isRevealed
    ) {
        DecryptedReport storage r = decryptedReports[reportId];
        return (r.title, r.content, r.category, r.isRevealed); 
    }

    /**
     * @notice Gets the encrypted count for a given category.
     * @param category The name of the category.
     * @return The encrypted count as an euint32.
     */
    function getEncryptedCategoryCount(string memory category) public view returns (euint32) {
        return encryptedCategoryCount[category]; 
    }
}