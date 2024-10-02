let localState = {};

//Regexes for parsing OpenAI responses
const CHATGPT_REGEX_TEST_CASE = /Test case[0-9\s]*:\nDescription: (.*?)\nInput: (.*?)\nExpected Output: (.*?)\n/gsi;
const CHATGPT_REGEX_TASK = /[0-9]*\.(.*?)\n(.*?)\n/gsi;
const CHATGPT_REGEX_STEP = /(Feature: (.*?))?Scenario[ 0-9]*: (.*?)^\n/gsim;
const CHATGPT_REGEX_RISK = /[0-9]*\.(.*?)\n/gsi;

const messages = {
    PERMISSION_ERROR: "ChatGPT SpiraApp: Sorry, you are not permitted to perform this action",
    WAIT_FOR_OTHER_JOB: "ChatGPT SpiraApp: Cannot generate {0} as another ChatGPT job is running. Please wait for it to finish!",
    EMPTY_REQUIREMENT: "ChatGPT SpiraApp: Fatal Error, empty requirement retrieved from Spira!",
    REQUIREMENT_NOT_STEPS: "ChatGPT SpiraApp: The current requirement is of a type that does not support BDD steps. Please change the requirement type and try again!",
    UNKNOWN_CHATGPT_ACTION: "ChatGPT SpiraApp: Sorry, an unknown ChatGPT action was attempted: ",
    NO_REQUIREMENT_TYPES: "ChatGPT SpiraApp: Fatal error, could not get any requirement types from Spira - please try again!",
    NO_RESPONSE: "ChatGPT SpiraApp: Fatal error, no response received from OpenAI - please try again!",
    INVALID_CONTENT: "ChatGPT SpiraApp: Invalid content received from OpenAI, not able to proceed.",
    INVALID_CONTENT_NO_GENERATE: "ChatGPT SpiraApp: could not generate {0} from ChatGPT's response - please try again.",
    UNKNOWN_ERROR: "ChatGPT SpiraApp: Unknown Error, please check the browser console or try again!",
    ARTIFACT_TEST_CASES: "test cases",
    ARTIFACT_TASKS: "tasks",
    ARTIFACT_BDD_STEPS: "BDD steps",
    ARTIFACT_RISKS: "risks",
}

//Register menu entry click events
spiraAppManager.registerEvent_menuEntryClick(APP_GUID, "generateTestCases", chatGPT_generateTestCases);
spiraAppManager.registerEvent_menuEntryClick(APP_GUID, "generateTasks", chatGPT_generateTasks);
spiraAppManager.registerEvent_menuEntryClick(APP_GUID, "generateSteps", chatGPT_generateSteps);
spiraAppManager.registerEvent_menuEntryClick(APP_GUID, "generateRisks", chatGPT_generateRisks);

//Generic error handling
function chatGPT_operation_failure(response) {
    localState.running = false;
    if (response.message && response.message != null && response.exceptionType && response.exceptionType != 0)
    {
        //Error Message from Spira
        var message = response.message;
        var type = response.exceptionType;
        spiraAppManager.displayErrorMessage('ChatGPT SpiraApp: ' + message + ' [' + type + ']');
    }
    else if (response.error && response.error.message)
    {
        //Error Message from OpenAI
        var message = response.error.message;
        var type = response.error.type;
        var code = response.error.code;
        spiraAppManager.displayErrorMessage('ChatGPT SpiraApp: ' + message + ' [' + code + ']');
    }
    else
    {
        spiraAppManager.displayErrorMessage(messages.UNKNOWN_ERROR);
        console.log(response);
    }
}

function chatGPT_generateTestCases() {
    const TEST_CASE_ARTIFACT_TYPE_ID = 2,
        canCreateTestCases = spiraAppManager.canCreateArtifactType(TEST_CASE_ARTIFACT_TYPE_ID);

    //Make sure call not already running
    if (localState.running)
    {
        spiraAppManager.displayWarningMessage(messages.WAIT_FOR_OTHER_JOB.replace("{0}", messages.ARTIFACT_TEST_CASES));
        return;
    }

    //Clear local storage and specify the action
    localState = {
        "action": "generateTestCases",
        "running": true
    };

    //Don't let users try and create test cases if they do not have permission to do so
    if (!canCreateTestCases)
    {
        spiraAppManager.displayErrorMessage(messages.PERMISSION_ERROR);
        localState.running = false;
    }
    else
    {
        //Get the current requirement artifact (we need to get its name)
        var requirementId = spiraAppManager.artifactId;
        var url = 'projects/' + spiraAppManager.projectId + '/requirements/' + requirementId;
        spiraAppManager.executeApi('chatGPT', '7.0', 'GET', url, null, chatGPT_getRequirementData_success, chatGPT_operation_failure);
    }
}

function chatGPT_generateTasks() {
    const TASK_ARTIFACT_TYPE_ID = 6,
        canCreateTasks = spiraAppManager.canCreateArtifactType(TASK_ARTIFACT_TYPE_ID);

    //Make sure call not already running
    if (localState.running)
    {
        spiraAppManager.displayWarningMessage(messages.WAIT_FOR_OTHER_JOB.replace("{0}", messages.ARTIFACT_TASKS));
        return;
    }

    //Clear local storage and specify the action
    localState = {
        "action": "generateTasks",
        "running": true
    };

    //Don't let users try and create tasks if they do not have permission to do so
    if (!canCreateTasks)
    {
        spiraAppManager.displayErrorMessage(messages.PERMISSION_ERROR);
        localState.running = false;
    }
    else
    {
        //Get the current requirement artifact (we need to get its name)
        var requirementId = spiraAppManager.artifactId;
        var url = 'projects/' + spiraAppManager.projectId + '/requirements/' + requirementId;
        spiraAppManager.executeApi('chatGPT', '7.0', 'GET', url, null, chatGPT_getRequirementData_success, chatGPT_operation_failure);
    }
}

function chatGPT_generateSteps() {
    const REQUIREMENT_ARTIFACT_TYPE_ID = 1,
        canModifyRequirements = spiraAppManager.canModifyArtifactType(REQUIREMENT_ARTIFACT_TYPE_ID);

    //Make sure call not already running
    if (localState.running)
    {
        spiraAppManager.displayWarningMessage(messages.WAIT_FOR_OTHER_JOB.replace("{0}", messages.ARTIFACT_BDD_STEPS));
        return;
    }

    //Clear local storage and specify the action
    localState = {
        "action": "generateSteps",
        "running": true
    };

    //Don't let users try and create requirement steps (considered a modify of the requirement) if they do not have permission to do so
    if (!canModifyRequirements)
    {
        spiraAppManager.displayErrorMessage(messages.PERMISSION_ERROR);
        localState.running = false;
    }
    else
    {
        //Get the current requirement artifact (we need to get its name)
        var requirementId = spiraAppManager.artifactId;
        var url = 'projects/' + spiraAppManager.projectId + '/requirements/' + requirementId;
        spiraAppManager.executeApi('chatGPT', '7.0', 'GET', url, null, chatGPT_getRequirementData_success, chatGPT_operation_failure);
    }
}

function chatGPT_generateRisks() {
    const RISK_ARTIFACT_TYPE_ID = 14,
        REQUIREMENT_ARTIFACT_TYPE_ID = 1,
        canCreateRisks = spiraAppManager.canCreateArtifactType(RISK_ARTIFACT_TYPE_ID),
        canModifyRequirements = spiraAppManager.canModifyArtifactType(REQUIREMENT_ARTIFACT_TYPE_ID);

    //Make sure call not already running
    if (localState.running)
    {
        spiraAppManager.displayWarningMessage(messages.WAIT_FOR_OTHER_JOB.replace("{0}", messages.ARTIFACT_RISKS));
        return;
    }

    //Clear local storage and specify the action
    localState = {
        "action": "generateRisks",
        "running": true
    };

    //Don't let users try and create risks if they do not have permission to do so
    if (!canCreateRisks || !canModifyRequirements)
    {
        spiraAppManager.displayErrorMessage(messages.PERMISSION_ERROR);
        localState.running = false;
    }
    else
    {
        //Get the current requirement artifact (we need to get its name)
        var requirementId = spiraAppManager.artifactId;
        var url = 'projects/' + spiraAppManager.projectId + '/requirements/' + requirementId;
        spiraAppManager.executeApi('chatGPT', '7.0', 'GET', url, null, chatGPT_getRequirementData_success, chatGPT_operation_failure);
    }
}

function chatGPT_getRequirementData_success(remoteRequirement)
{
    if (remoteRequirement)
    {
        //Store for later
        localState.remoteRequirement = remoteRequirement;

        //Make an API call to get the requirement type information
        var requirementTypeId = remoteRequirement.RequirementTypeId;
        var url = 'project-templates/' + spiraAppManager.projectTemplateId + '/requirements/types';
        spiraAppManager.executeApi('chatGPT', '7.0', 'GET', url, null, chatGPT_getRequirementTypes_success, chatGPT_operation_failure);
    }
    else
    {
        spiraAppManager.displayErrorMessage(messages.EMPTY_REQUIREMENT);
        localState.running = false;   
    }
}

function chatGPT_getRequirementTypes_success(remoteRequirementTypes)
{
    var remoteRequirement = localState.remoteRequirement;
    if (remoteRequirementTypes && remoteRequirement)
    {
        //Get the optional OpenAI Organization from settings
        var organization;
        if (SpiraAppSettings[APP_GUID])
        {
            organization = SpiraAppSettings[APP_GUID].organization
        }

        //Create the prompt based on the action, see if we have a custom one as well
        var prompt;
        if (localState.action == 'generateTestCases')
        {
            prompt = "Write the test cases for the following software requirement. For each test case include the description, input and expected output.";
            if (SpiraAppSettings[APP_GUID].testcase_prompt && SpiraAppSettings[APP_GUID].testcase_prompt != '')
            {
                prompt = SpiraAppSettings[APP_GUID].testcase_prompt;
            }
        }
        else if (localState.action == 'generateTasks')
        {
            prompt = "Write the development tasks for the following software requirement.";
            if (SpiraAppSettings[APP_GUID].task_prompt && SpiraAppSettings[APP_GUID].task_prompt != '')
            {
                prompt = SpiraAppSettings[APP_GUID].task_prompt;
            }
        }
        else if (localState.action == 'generateSteps')
        {
            //Make sure the requirement type supports steps
            var supportsSteps = false;
            for (var i = 0; i < remoteRequirementTypes.length; i++)
            {
                var remoteRequirementType = remoteRequirementTypes[i];
                if (remoteRequirementType.RequirementTypeId == remoteRequirement.RequirementTypeId)
                {
                    if (remoteRequirementType.IsSteps)
                    {
                        supportsSteps = true;
                    }
                    break;
                }
            }

            if (supportsSteps)
            {
                prompt = "Write the BDD scenarios for the following software requirement.";
                if (SpiraAppSettings[APP_GUID].bdd_prompt && SpiraAppSettings[APP_GUID].bdd_prompt != '')
                {
                    prompt = SpiraAppSettings[APP_GUID].bdd_prompt;
                }
            }
            else
            {
                //Unknown action
                spiraAppManager.displayErrorMessage(messages.REQUIREMENT_NOT_STEPS);
                localState.running = false;
                return;
            }
        }
        else if (localState.action == 'generateRisks')
        {
            prompt = "Identify the possible business and technical risks for the following software requirement.";
            if (SpiraAppSettings[APP_GUID].risk_prompt && SpiraAppSettings[APP_GUID].risk_prompt != '')
            {
                prompt = SpiraAppSettings[APP_GUID].risk_prompt;
            }
        }
        else
        {
            //Unknown action
            spiraAppManager.displayErrorMessage(messages.UNKNOWN_CHATGPT_ACTION + localState.action);
            localState.running = false;
            return;
        }

		///https://api.openai.com/v1/chat/completions
		var url = 'https://api.openai.com/v1/chat/completions';

        //Specify the model
        var model = 'gpt-3.5-turbo';
        if (SpiraAppSettings[APP_GUID].model && SpiraAppSettings[APP_GUID].model != '')
        {
            model = SpiraAppSettings[APP_GUID].model;
        }

        //Specify the temperature
        var temperature = 0.2;
        if (SpiraAppSettings[APP_GUID].temperature && SpiraAppSettings[APP_GUID].temperature != '' && parseFloat(SpiraAppSettings[APP_GUID].temperature))
        {
            temperature = parseFloat(SpiraAppSettings[APP_GUID].temperature);
        }

		//Send the OpenAI request
		var body = {
            "model": model,
            "temperature": temperature,
            "messages": [
                {
                "role": "system",
                "content": prompt
                },
                {
                "role": "user",
                "content": remoteRequirement.Name
                }
            ]
        };

        var headers = {
			"Content-Type": "application/json",
			"Accept": "application/json",
			"User-agent": "Spira",
            "Authorization": "Bearer ${api_key}"
		};

        //Add the organization optional header
        if (organization && organization != '')
        {
            headers["OpenAI-Organization"] = organization;
        }

		spiraAppManager.executeRest(APP_GUID, 'chatGPT', 'POST', url, JSON.stringify(body), null, headers, chatGPT_processResponse, chatGPT_operation_failure);
    }
    else
    {
        spiraAppManager.displayErrorMessage(messages.NO_REQUIREMENT_TYPES);
        localState.running = false;
    }
}

function chatGPT_processResponse(response) {
    if (!response)
    {
        spiraAppManager.displayErrorMessage(messages.NO_RESPONSE);
        localState.running = false;
        return;
    }

    //Check for error response
    if (response.statusCode != 200)
    {
        //Error Message from OpenAI
        var message = response.statusDescription;   //Summary message, try and get more detailed one
        if (response.content)
        {
            var messageObj = JSON.parse(response.content);
            if (messageObj.error && messageObj.error.message)
            {
                message = messageObj.error.message;
            }
        }
        var code = response.statusCode;
        if (message && message != null && code != 0) {
            spiraAppManager.displayErrorMessage('ChatGPT SpiraApp: ' + message + ' [' + code + ']');
        } else {
            spiraAppManager.displayErrorMessage(messages.UNKNOWN_ERROR);
            console.log(response);
        }
        localState.running = false;
        return;
    }

    //Get the response and parse out
    if (!response.content)
    {
        spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT);
        console.log(response);
        localState.running = false;
        return;
    }

    //Need to deserialize the content
    var content = JSON.parse(response.content);
    if (!content.choices || !content.usage)
    {
        spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT);
        console.log(content);
        localState.running = false;
        return;
    }

    localState.tokensUse = content.usage.total_tokens;
    var choices = content.choices;

    //Loop through the returned choices
    for (var i = 0; i < choices.length; i++)
    {
        //See what action we had and call the appropriate parsing function
        if (localState.action == 'generateTestCases')
        {
            chatGPT_generateTestCasesFromChoice(choices[i]);
        }
        else if (localState.action == 'generateTasks')
        {
            chatGPT_generateTasksFromChoice(choices[i]);
        }
        else if (localState.action == 'generateSteps')
        {
            chatGPT_generateStepsFromChoice(choices[i]);
        }
        else if (localState.action == 'generateRisks')
        {
            chatGPT_generateRisksFromChoice(choices[i]);
        }
        else
        {
            localState.running = false;
        }
    }
}

function chatGPT_generateTestCasesFromChoice(choice)
{
    //Get the message
    if (choice.message.content)
    {
        var messageContent = choice.message.content.replaceAll('\\n', '\n').replaceAll('\\"', '"') + '\n';

        //See if we have a custom regex specified
        var regex = CHATGPT_REGEX_TEST_CASE;
        if (SpiraAppSettings[APP_GUID].testcase_regex && SpiraAppSettings[APP_GUID].testcase_regex != '')
        {
            regex = chatGPT_createRegexFromString(SpiraAppSettings[APP_GUID].testcase_regex);
        }

        //We need to parse into multiple test cases with step and expected result
        var matches = [...messageContent.matchAll(regex)];
        //console.log(matches);

        //loop through the matches and get the groups
        if (matches && matches.length > 0)
        {
            localState.testCaseCount = matches.length;
            for (var i = 0; i < matches.length; i++)
            {
                //Now get each group in the match
                var match = matches[i];
                if (match.length >= 4)
                {
                    //Get the 3 provided fields
                    var testCaseDescription = match[1];
                    var testCaseSampleData = match[2];
                    var expectedOutput = match[3];

                    //Store the input/expectedOutput for use later
                    var context = {
                        description: testCaseDescription,
                        input: testCaseSampleData,
                        expectedOutput: expectedOutput
                    };
                    localState[testCaseDescription] = context;

                    //Create the new test case
                    if (testCaseDescription && testCaseDescription != '')
                    {
                        var remoteTestCase = {}
                        remoteTestCase.Name = testCaseDescription;
                        remoteTestCase.TestCaseStatusId = /* Draft */1;
                        remoteTestCase.TestCaseTypeId = null;   //Default

                        //Call the API to create
                        const url = 'projects/' + spiraAppManager.projectId + '/test-cases';
                        const body = JSON.stringify(remoteTestCase);
                        spiraAppManager.executeApi('chatGPT', '7.0', 'POST', url, body, chatGPT_generateTestCasesFromChoice_success, chatGPT_operation_failure);    
                    }
                }
            }
        }
        else
        {
            spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT_NO_GENERATE.replace("{0}", messages.ARTIFACT_TEST_CASES));
            console.log(messageContent);
            localState.running = false;
            return;
        }
    }
}

function chatGPT_generateTestCasesFromChoice_success(remoteTestCase)
{
    //Add the test case to the requirement
    if (remoteTestCase) {
        var requirementId = spiraAppManager.artifactId;
        var remoteReqTestCaseMapping = {
            RequirementId: requirementId,
            TestCaseId: remoteTestCase.TestCaseId
        };
        var url = 'projects/' + spiraAppManager.projectId + '/requirements/test-cases';
        var body = JSON.stringify(remoteReqTestCaseMapping);
        spiraAppManager.executeApi('chatGPT', '7.0', 'POST', url, body, chatGPT_generateTestCasesFromChoice_success2, chatGPT_operation_failure);

        //See if we have any stored steps for this test case
        if (localState[remoteTestCase.Name])
        {
            var context = localState[remoteTestCase.Name];

            //Create a default test step
            var remoteTestStep = {
                ProjectId: spiraAppManager.projectId,
                TestCaseId: remoteTestCase.TestCaseId,
                Description: context.description,
                ExpectedResult: context.expectedOutput,
                SampleData: context.input
            };

            var url = 'projects/' + spiraAppManager.projectId + '/test-cases/' + remoteTestCase.TestCaseId + '/test-steps';
            var body = JSON.stringify(remoteTestStep);
            spiraAppManager.executeApi('chatGPT', '7.0', 'POST', url, body, chatGPT_generateTestCasesFromChoice_success3, chatGPT_operation_failure);
        }
    }
}

function chatGPT_generateTestCasesFromChoice_success2()
{
    //Reset the dialog and force the form manager to reload once all test cases have been created
    localState.testCaseCount--;
    if (localState.testCaseCount == 0) {
        spiraAppManager.hideMessage();
        spiraAppManager.reloadForm();
        spiraAppManager.displaySuccessMessage('Successfully created test cases, using ' + localState.tokensUse + ' OpenAI tokens.');
    }
    localState.running = false;
}

function chatGPT_generateTestCasesFromChoice_success3(remoteTestStep)
{
    //Do nothing except clear running flag
    localState.running = false;
}

function chatGPT_generateTasksFromChoice(choice)
{
    //Get the message
    if (choice.message.content)
    {
        var messageContent = choice.message.content.replaceAll('\\n', '\n').replaceAll('\\"', '"') + '\n';

        //See if we have a custom regex specified
        var regex = CHATGPT_REGEX_TASK;
        if (SpiraAppSettings[APP_GUID].task_regex && SpiraAppSettings[APP_GUID].task_regex != '')
        {
            regex = chatGPT_createRegexFromString(SpiraAppSettings[APP_GUID].task_regex);
        }
        
        //We need to parse into multiple tasks
        var matches = [...messageContent.matchAll(regex)];
        //console.log(matches);

        //loop through the matches and get the groups
        if (matches && matches.length > 0)
        {
            localState.taskCount = matches.length;
            for (var i = 0; i < matches.length; i++)
            {
                //Now get each group in the match
                var match = matches[i];
                if (match.length >= 2)
                {
                    //Get the task name
                    var taskName = match[1];

                    //Create the new task
                    if (taskName && taskName != '')
                    {
                        var requirementId = spiraAppManager.artifactId;
                        var remoteTask = {}
                        remoteTask.ProjectId = spiraAppManager.projectId;
                        remoteTask.RequirementId = requirementId;
                        remoteTask.Name = taskName;
                        remoteTask.TaskStatusId = /* Not Started */1;
                        remoteTask.TaskTypeId = null;   //Default

                        //Call the API to create
                        const url = 'projects/' + spiraAppManager.projectId + '/tasks';
                        const body = JSON.stringify(remoteTask);
                        spiraAppManager.executeApi('chatGPT', '7.0', 'POST', url, body, chatGPT_generateTasksFromChoice_success, chatGPT_operation_failure);    
                    }
                }
            }
        }
        else
        {
            spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT_NO_GENERATE.replace("{0}", messages.ARTIFACT_TASKS));
            console.log(messageContent);
            localState.running = false;
            return;
        }
    }
}
function chatGPT_generateTasksFromChoice_success(remoteTask)
{
    //Reset the dialog and force the form manager to reload once all tasks have been created
    localState.taskCount--;
    if (localState.taskCount == 0) {
        spiraAppManager.hideMessage();
        spiraAppManager.reloadForm();
        spiraAppManager.displaySuccessMessage('Successfully created tasks, using ' + localState.tokensUse + ' OpenAI tokens.');
    }
    localState.running = false;
}

function chatGPT_generateStepsFromChoice(choice)
{
    //Get the message
    if (choice.message.content)
    {
        var messageContent = choice.message.content.replaceAll('\\n', '\n').replaceAll('\\"', '"') + '\n';

        //See if we have a custom regex specified
        var regex = CHATGPT_REGEX_STEP;
        if (SpiraAppSettings[APP_GUID].bdd_regex && SpiraAppSettings[APP_GUID].bdd_regex != '')
        {
            regex = chatGPT_createRegexFromString(SpiraAppSettings[APP_GUID].bdd_regex);
        }

        //We need to parse into multiple steps
        var matches = [...messageContent.matchAll(regex)];
        //console.log(matches);

        //loop through the matches and get the groups
        if (matches && matches.length > 0)
        {
            localState.stepCount = matches.length;
            for (var i = 0; i < matches.length; i++)
            {
                //Now get each group in the match
                var match = matches[i];
                if (match.length >= 4)
                {
                    //Get the scenario description
                    var feature = match[1];
                    var scenario = match[3];

                    //TODO: We could update the description with the Feature?
                    
                    //Create the new scenarios as steps
                    if (scenario && scenario != '')
                    {
                        var requirementId = spiraAppManager.artifactId;
                        var remoteRequirementStep = {}
                        remoteRequirementStep.ProjectId = spiraAppManager.projectId;
                        remoteRequirementStep.RequirementId = requirementId;
                        remoteRequirementStep.Description = scenario;
                        remoteRequirementStep.CreationDate = new Date().toISOString();

                        //Call the API to create
                        const url = 'projects/' + spiraAppManager.projectId + '/requirements/' + requirementId + '/steps';
                        const body = JSON.stringify(remoteRequirementStep);
                        spiraAppManager.executeApi('chatGPT', '7.0', 'POST', url, body, chatGPT_generateStepsFromChoice_success, chatGPT_operation_failure);    
                    }
                }
            }
        }
        else
        {
            spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT_NO_GENERATE.replace("{0}", messages.ARTIFACT_BDD_STEPS));
            console.log(messageContent);
            localState.running = false;
            return;
        }
    }
}
function chatGPT_generateStepsFromChoice_success(remoteRequirementStep)
{
    //Reset the dialog and force the form manager and scenario grid to reload once all tasks have been created
    localState.stepCount--;
    if (localState.stepCount == 0) {
        console.log(spiraAppManager.gridIds)
        spiraAppManager.hideMessage();
        spiraAppManager.reloadForm();
        spiraAppManager.reloadGrid(spiraAppManager.gridIds.requirementSteps);
        spiraAppManager.displaySuccessMessage('Successfully created BDD Scenario Steps, using ' + localState.tokensUse + ' OpenAI tokens.');
    }
    localState.running = false;
}

function chatGPT_generateRisksFromChoice(choice)
{
    //Get the message
    if (choice.message.content)
    {
        var messageContent = choice.message.content.replaceAll('\\n', '\n').replaceAll('\\"', '"') + '\n';

        //See if we have a custom regex specified
        var regex = CHATGPT_REGEX_RISK;
        if (SpiraAppSettings[APP_GUID].risk_regex && SpiraAppSettings[APP_GUID].risk_regex != '')
        {
            regex = chatGPT_createRegexFromString(SpiraAppSettings[APP_GUID].risk_regex);
        }

        //We need to parse into multiple steps
        var matches = [...messageContent.matchAll(regex)];
        //console.log(matches);

        //loop through the matches and get the groups
        if (matches && matches.length > 0)
        {
            localState.riskCount = matches.length;
            for (var i = 0; i < matches.length; i++)
            {
                //Now get each group in the match
                var match = matches[i];
                if (match.length >= 2)
                {
                    //Get the risk name
                    var riskName = match[1];

                    //Create the new risk
                    if (riskName && riskName != '')
                    {
                        var remoteRisk = {}
                        remoteRisk.ProjectId = spiraAppManager.projectId;
                        remoteRisk.Name = riskName;

                        //Call the API to create
                        const url = 'projects/' + spiraAppManager.projectId + '/risks';
                        const body = JSON.stringify(remoteRisk);
                        spiraAppManager.executeApi('chatGPT', '7.0', 'POST', url, body, chatGPT_generateRisksFromChoice_success, chatGPT_operation_failure);    
                    }
                }
            }
        }
        else
        {
            spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT_NO_GENERATE.replace("{0}", messages.ARTIFACT_RISKS));
            console.log(messageContent);
            localState.running = false;
            return;
        }
    }
}
function chatGPT_generateRisksFromChoice_success(remoteRisk)
{
    const REQUIREMENT_ARTIFACT_TYPE_ID = 1;
    const RISK_ARTIFACT_TYPE_ID = 14;

   //Add the risk to the requirement
   if (remoteRisk) {
        var requirementId = spiraAppManager.artifactId;
        var remoteAssociation = {
            SourceArtifactId: requirementId,
            SourceArtifactTypeId: REQUIREMENT_ARTIFACT_TYPE_ID,
            DestArtifactId: remoteRisk.RiskId,
            DestArtifactTypeId: RISK_ARTIFACT_TYPE_ID,
            ArtifactLinkTypeId: 1 /* Related */
        };

        var url = 'projects/' + spiraAppManager.projectId + '/associations';
        var body = JSON.stringify(remoteAssociation);
        spiraAppManager.executeApi('chatGPT', '7.0', 'POST', url, body, chatGPT_generateRisksFromChoice_success2, chatGPT_operation_failure);
    }
    else
    {
        localState.running = false;
    }
}
function chatGPT_generateRisksFromChoice_success2(remoteTask)
{
    //Reset the dialog and force the form manager to reload once all risks have been created
    localState.riskCount--;
    if (localState.riskCount == 0) {
        spiraAppManager.hideMessage();
        spiraAppManager.reloadForm();
        spiraAppManager.displaySuccessMessage('Successfully created Risks, using ' + localState.tokensUse + ' OpenAI tokens.');
    }
    localState.running = false;
}

function chatGPT_createRegexFromString(string)
{
    const pattern = string.slice(1, string.lastIndexOf('/'));
    const flags = string.slice(string.lastIndexOf('/') + 1);
    
    const regex = new RegExp(pattern, flags);
    return regex;
}
