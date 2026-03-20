// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MicroMoodle {
    address public teacher;
    string public courseName;
    uint256 public deadline;

    struct Submission {
        bytes32 fileHash;
        uint256 timestamp;
    }

    mapping(address => Submission) public submissions;
    mapping(address => uint256) public grades;
    mapping(address => bool) public hasSubmitted;
    mapping(address => bool) public isGraded;
    mapping(address => bool) public enrolledStudents;
    
    // Optional Feature: Dispute mechanism
    mapping(address => string) public disputes;

    // Array to keep track of all students who submitted
    address[] public studentList;

    event AssignmentSubmitted(address indexed student, bytes32 fileHash, uint256 timestamp);
    event GradeAssigned(address indexed student, uint256 marks);
    event DisputeRaised(address indexed student, string reason);

    constructor(string memory _courseName, uint256 _durationInDays) {
        teacher = msg.sender;
        courseName = _courseName;
        deadline = block.timestamp + (_durationInDays * 1 days);
    }

    modifier onlyTeacher() {
        require(msg.sender == teacher, "Only teacher can perform this action");
        _;
    }

    function enrollStudent(address student) external onlyTeacher {
        enrolledStudents[student] = true;
    }

    function submitAssignment(bytes32 fileHash) external {
        require(enrolledStudents[msg.sender], "Not enrolled in course");
        require(block.timestamp <= deadline, "Deadline has passed");
        require(!hasSubmitted[msg.sender], "Already submitted");

        submissions[msg.sender] = Submission({
            fileHash: fileHash,
            timestamp: block.timestamp
        });
        hasSubmitted[msg.sender] = true;
        studentList.push(msg.sender);

        emit AssignmentSubmitted(msg.sender, fileHash, block.timestamp);
    }

    function assignGrade(address student, uint256 marks) external onlyTeacher {
        require(hasSubmitted[student], "Student has not submitted yet");
        require(!isGraded[student], "Already graded");

        grades[student] = marks;
        isGraded[student] = true;

        emit GradeAssigned(student, marks);
    }

    function getSubmission(address student) external view returns (bytes32, uint256) {
        require(hasSubmitted[student], "No submission found");
        return (submissions[student].fileHash, submissions[student].timestamp);
    }

    function getGrade(address student) external view returns (uint256) {
        require(isGraded[student], "Not graded yet");
        return grades[student];
    }

    function getAllSubmissions() external view returns (address[] memory) {
        return studentList;
    }

    // Optional Feature: Disputing grades
    function fileDispute(string calldata reason) external {
        require(enrolledStudents[msg.sender], "Not enrolled");
        require(isGraded[msg.sender], "Must be graded to dispute");
        
        disputes[msg.sender] = reason;
        emit DisputeRaised(msg.sender, reason);
    }
}
