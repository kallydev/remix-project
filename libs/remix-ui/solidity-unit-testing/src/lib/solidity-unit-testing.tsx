import React, { useState, useRef, useEffect } from 'react' // eslint-disable-line
// import { TestTabLogic } from './logic/testTabLogic'
var async = require('async')
import { canUseWorker, urlFromVersion } from '@remix-project/remix-solidity'

import './css/style.css'

/* eslint-disable-next-line */
export interface SolidityUnitTestingProps {}

interface TestObject {
  fileName: string
  checked: boolean
}

export const SolidityUnitTesting = (props: any) => {

  const {helper, testTab} = props

  const { testTabLogic } = testTab

  const [defaultPath, setDefaultPath] = useState('tests')
  const [disableCreateButton, setDisableCreateButton] = useState(true)
  const [disableGenerateButton, setDisableGenerateButton] = useState(false)
  const [disableStopButton, setDisableStopButton] = useState(true)
  const [disableRunButton, setDisableRunButton] = useState(false)
  const [runButtonTitle, setRunButtonTitle] = useState('Run tests')
  const [stopButtonLabel, setStopButtonLabel] = useState('Stop')
  const [checkSelectAll, setCheckSelectAll] = useState(true)
  
  const [testsExecutionStoppedHidden, setTestsExecutionStoppedHidden] = useState(true)
  const [testsExecutionStoppedErrorHidden, setTestsExecutionStoppedErrorHidden] = useState(true)

  let [testFiles, setTestFiles] = useState<TestObject[]>([])
  const [pathOptions, setPathOptions] = useState([''])
  let [allTests, setAllTests] = useState([])
  let [selectedTests, setSelectedTests] = useState<string[]>([])
  
  const [inputPathValue, setInputPathValue] = useState('tests')

  let [readyTestsNumber, setReadyTestsNumber] = useState(0)
  let [runningTestsNumber, setRunningTestsNumber] = useState(0)
  let [hasBeenStopped, setHasBeenStopped] = useState(false)
  let [areTestsRunning, setAreTestsRunning] = useState(false)
  let [isDebugging, setIsDebugging] = useState(false)
  
  
  
  const trimTestDirInput = (input:string) => {
    if (input.includes('/')) return input.split('/').map(e => e.trim()).join('/')
    else return input.trim()
  }

  const clearResults = () => {
    console.log('clearResults--->')
    // yo.update(this.resultStatistics, yo`<span></span>`)
    testTab.call('editor', 'clearAnnotations')
    // this.testsOutput.innerHTML = ''
    // this.testsOutput.hidden = true
    setTestsExecutionStoppedHidden(true)
    setTestsExecutionStoppedErrorHidden(true)
  }

   const updateForNewCurrent = async (file = null) => {
    // Ensure that when someone clicks on compilation error and that opens a new file
    // Test result, which is compilation error in this case, is not cleared
    // if (this.currentErrors) {
    //   if (Array.isArray(this.currentErrors) && this.currentErrors.length > 0) {
    //     const errFiles = this.currentErrors.map(err => { if (err.sourceLocation && err.sourceLocation.file) return err.sourceLocation.file })
    //     if (errFiles.includes(file)) return
    //   } else if (this.currentErrors.sourceLocation && this.currentErrors.sourceLocation.file && this.currentErrors.sourceLocation.file === file) return
    // }
    // // if current file is changed while debugging and one of the files imported in test file are opened
    // // do not clear the test results in SUT plugin
    // if (this.isDebugging && this.allFilesInvolved.includes(file)) return
    console.log('Inside updateForNewCurrent --allTests-->', allTests)
    allTests = []
    updateTestFileList()
    clearResults()
    // if (!areTestsRunning) updateRunAction(file)
    try {
      testTabLogic.getTests((error: any, tests: any) => {
        // if (error) return tooltip(error)
        console.log('tests in updateForNewCurrent testTabLogic.getTests', tests)
        allTests = tests
        selectedTests = [...allTests]
        setSelectedTests(tests)
        updateTestFileList()
        // if (!this.testsOutput) return // eslint-disable-line
      })
    } catch (e) {
      console.log('error in updateForNewCurrent', e)
    }
  }

  useEffect(() => {
    updateDirList('/')
    updateForNewCurrent()
  }, [])

  const updateDirList = (path: string) => {
    testTabLogic.dirList(path).then((options: any) => {
      setPathOptions(options)
    })
  }

  const handleTestDirInput = async (e: any) => {
    console.log('handleTestDirInput--e-->', e.target)

    let testDirInput = trimTestDirInput(e.target.value)
    console.log('handleTestDirInput--e-->', testDirInput)
    testDirInput = helper.removeMultipleSlashes(testDirInput)
    if (testDirInput !== '/') testDirInput = helper.removeTrailingSlashes(testDirInput)
    setInputPathValue(testDirInput)
    if (e.key === 'Enter') {
      if (await testTabLogic.pathExists(testDirInput)) {
        testTabLogic.setCurrentPath(testDirInput)
        updateForNewCurrent()
        return
      }
    }
    if (testDirInput) {
      if (testDirInput.endsWith('/') && testDirInput !== '/') {
        testDirInput = helper.removeTrailingSlashes(testDirInput)
        if (testTabLogic.currentPath === testDirInput.substr(0, testDirInput.length - 1)) {
          setDisableCreateButton(true)
          setDisableGenerateButton(true)
        }
        updateDirList(testDirInput)
      } else {
        // If there is no matching folder in the workspace with entered text, enable Create button
        if (await testTabLogic.pathExists(testDirInput)) {
          setDisableCreateButton(true)
          setDisableGenerateButton(false)
          testTabLogic.setCurrentPath(testDirInput)
          updateForNewCurrent()
        } else {
          // Enable Create button
          setDisableCreateButton(false)
          // Disable Generate button because dir does not exist
          setDisableGenerateButton(true)
        }
      }
    } else {
      updateDirList('/')
    }
  }

  const handleEnter = async(e:any) => {
    console.log('handleEnter --e-->', e)
    let inputPath = e.target.value
    inputPath = helper.removeMultipleSlashes(trimTestDirInput(inputPath))
    setInputPathValue(inputPath)
    if (disableCreateButton) {
      if (await testTabLogic.pathExists(inputPath)) {
        testTabLogic.setCurrentPath(inputPath)
        updateForNewCurrent()
      }
    }
  }

  const handleCreateFolder = () => {
    let inputPath = trimTestDirInput(inputPathValue)
    let path = helper.removeMultipleSlashes(inputPath)
    if (path !== '/') path = helper.removeTrailingSlashes(path)
    if (inputPath === '') inputPath = defaultPath
    setInputPathValue(path)
    testTabLogic.generateTestFolder(inputPath)
    setDisableCreateButton(true)
    setDisableGenerateButton(false)
    testTabLogic.setCurrentPath(inputPath)
    console.log('path-->', path)
    console.log('inputPath-->', inputPath)
    updateRunAction()
    updateForNewCurrent()
    pathOptions.push(inputPath)
    setPathOptions(pathOptions)
  }

  const testCallback = (result, runningTests) => {
    console.log('result---in testCallback->', result)
    // this.testsOutput.hidden = false
    // let debugBtn = yo``
    // if ((result.type === 'testPass' || result.type === 'testFailure') && result.debugTxHash) {
    //   const { web3, debugTxHash } = result
    //   debugBtn = yo`<div id=${result.value.replaceAll(' ', '_')} class="btn border btn btn-sm ml-1" title="Start debugging" onclick=${() => this.startDebug(debugTxHash, web3)}>
    //     <i class="fas fa-bug"></i>
    //   </div>`
    //   debugBtn.style.cursor = 'pointer'
    // }
    // if (result.type === 'contract') {
    //   this.testSuite = result.value
    //   if (this.testSuites) {
    //     this.testSuites.push(this.testSuite)
    //   } else {
    //     this.testSuites = [this.testSuite]
    //   }
    //   this.rawFileName = result.filename
    //   this.runningTestFileName = this.cleanFileName(this.rawFileName, this.testSuite)
    //   this.outputHeader = yo`
    //     <div id="${this.runningTestFileName}" data-id="testTabSolidityUnitTestsOutputheader" class="pt-1">
    //       <span class="font-weight-bold">${this.testSuite} (${this.rawFileName})</span>
    //     </div>
    //   `
    //   this.testsOutput.appendChild(this.outputHeader)
    // } else if (result.type === 'testPass') {
    //   if (result.hhLogs && result.hhLogs.length) this.printHHLogs(result.hhLogs, result.value)
    //   this.testsOutput.appendChild(yo`
    //     <div
    //       id="${this.runningTestFileName}"
    //       data-id="testTabSolidityUnitTestsOutputheader"
    //       class="${css.testPass} ${css.testLog} bg-light mb-2 px-2 text-success border-0"
    //       onclick=${() => this.discardHighlight()}
    //     >
    //       <div class="d-flex my-1 align-items-start justify-content-between">
    //         <span style="margin-block: auto" > ✓ ${result.value}</span>
    //         ${debugBtn}
    //       </div>
    //     </div>
    //   `)
    // } else if (result.type === 'testFailure') {
    //   if (result.hhLogs && result.hhLogs.length) this.printHHLogs(result.hhLogs, result.value)
    //   if (!result.assertMethod) {
    //     this.testsOutput.appendChild(yo`
    //     <div
    //       class="bg-light mb-2 px-2 ${css.testLog} d-flex flex-column text-danger border-0"
    //       id="UTContext${result.context}"
    //       onclick=${() => this.highlightLocation(result.location, runningTests, result.filename)}
    //     >
    //       <div class="d-flex my-1 align-items-start justify-content-between">
    //         <span> ✘ ${result.value}</span>
    //         ${debugBtn}
    //       </div>
    //       <span class="text-dark">Error Message:</span>
    //       <span class="pb-2 text-break">"${result.errMsg}"</span>
    //     </div>
    //   `)
    //   } else {
    //     const preposition = result.assertMethod === 'equal' || result.assertMethod === 'notEqual' ? 'to' : ''
    //     const method = result.assertMethod === 'ok' ? '' : result.assertMethod
    //     const expected = result.assertMethod === 'ok' ? '\'true\'' : result.expected
    //     this.testsOutput.appendChild(yo`
    //       <div
    //         class="bg-light mb-2 px-2 ${css.testLog} d-flex flex-column text-danger border-0"
    //         id="UTContext${result.context}"
    //         onclick=${() => this.highlightLocation(result.location, runningTests, result.filename)}
    //       >
    //         <div class="d-flex my-1 align-items-start justify-content-between">  
    //           <span> ✘ ${result.value}</span>
    //           ${debugBtn}
    //         </div> 
    //         <span class="text-dark">Error Message:</span>
    //         <span class="pb-2 text-break">"${result.errMsg}"</span>
    //         <span class="text-dark">Assertion:</span>
    //         <div class="d-flex flex-wrap">
    //           <span>Expected value should be</span>
    //           <div class="mx-1 font-weight-bold">${method}</div>
    //           <div>${preposition} ${expected}</div>
    //         </div>
    //         <span class="text-dark">Received value:</span>
    //         <span>${result.returned}</span>
    //         <span class="text-dark text-sm pb-2">Skipping the remaining tests of the function.</span>
    //       </div>
    //     `)
    //   }
    // } else if (result.type === 'logOnly') {
    //   if (result.hhLogs && result.hhLogs.length) this.printHHLogs(result.hhLogs, result.value)
    // }
  }

  const resultsCallback = (_err, result, cb) => {
    // total stats for the test
    // result.passingNum
    // result.failureNum
    // result.timePassed
    cb()
  }

  const updateFinalResult = (_errors, result, filename) => {
    // ++this.readyTestsNumber
    // this.testsOutput.hidden = false
    // if (!result && (_errors && (_errors.errors || (Array.isArray(_errors) && (_errors[0].message || _errors[0].formattedMessage))))) {
    //   this.testCallback({ type: 'contract', filename })
    //   this.currentErrors = _errors.errors
    //   this.setHeader(false)
    // }
    // if (_errors && _errors.errors) {
    //   _errors.errors.forEach((err) => this.renderer.error(err.formattedMessage || err.message, this.testsOutput, { type: err.severity, errorType: err.type }))
    // } else if (_errors && Array.isArray(_errors) && (_errors[0].message || _errors[0].formattedMessage)) {
    //   _errors.forEach((err) => this.renderer.error(err.formattedMessage || err.message, this.testsOutput, { type: err.severity, errorType: err.type }))
    // } else if (_errors && !_errors.errors && !Array.isArray(_errors)) {
    //   // To track error like this: https://github.com/ethereum/remix/pull/1438
    //   this.renderer.error(_errors.formattedMessage || _errors.message, this.testsOutput, { type: 'error' })
    // }
    // yo.update(this.resultStatistics, this.createResultLabel())
    // if (result) {
    //   const totalTime = parseFloat(result.totalTime).toFixed(2)

    //   if (result.totalPassing > 0 && result.totalFailing > 0) {
    //     this.testsOutput.appendChild(yo`
    //       <div class="d-flex alert-secondary mb-3 p-3 flex-column">
    //         <span class="font-weight-bold">Result for ${filename}</span>
    //         <span class="text-success">Passing: ${result.totalPassing}</span>
    //         <span class="text-danger">Failing: ${result.totalFailing}</span>
    //         <span>Total time: ${totalTime}s</span>
    //       </div>
    //     `)
    //   } else if (result.totalPassing > 0 && result.totalFailing <= 0) {
    //     this.testsOutput.appendChild(yo`
    //       <div class="d-flex alert-secondary mb-3 p-3 flex-column">
    //         <span class="font-weight-bold">Result for ${filename}</span>
    //         <span class="text-success">Passing: ${result.totalPassing}</span>
    //         <span>Total time: ${totalTime}s</span>
    //       </div>
    //     `)
    //   } else if (result.totalPassing <= 0 && result.totalFailing > 0) {
    //     this.testsOutput.appendChild(yo`
    //       <div class="d-flex alert-secondary mb-3 p-3 flex-column">
    //         <span class="font-weight-bold">Result for ${filename}</span>
    //         <span class="text-danger">Failing: ${result.totalFailing}</span>
    //         <span>Total time: ${totalTime}s</span>
    //       </div>
    //     `)
    //   }
    //   // fix for displaying right label for multiple tests (testsuites) in a single file
    //   this.testSuites.forEach(testSuite => {
    //     this.testSuite = testSuite
    //     this.runningTestFileName = this.cleanFileName(filename, this.testSuite)
    //     this.outputHeader = document.querySelector(`#${this.runningTestFileName}`)
    //     this.setHeader(true)
    //   })

    //   result.errors.forEach((error, index) => {
    //     this.testSuite = error.context
    //     this.runningTestFileName = this.cleanFileName(filename, error.context)
    //     this.outputHeader = document.querySelector(`#${this.runningTestFileName}`)
    //     const isFailingLabel = document.querySelector(`.failed_${this.runningTestFileName}`)
    //     if (!isFailingLabel) this.setHeader(false)
    //   })
    //   this.testsOutput.appendChild(yo`
    //     <div>
    //       <p class="text-info mb-2 border-top m-0"></p>
    //     </div>
    //   `)
    // }
    // if (this.hasBeenStopped && (this.readyTestsNumber !== this.runningTestsNumber)) {
    //   // if all tests has been through before stopping no need to print this.
    //   this.testsExecutionStopped.hidden = false
    // }
    // if (_errors) this.testsExecutionStoppedError.hidden = false
    // if (_errors || this.hasBeenStopped || this.readyTestsNumber === this.runningTestsNumber) {
    //   // All tests are ready or the operation has been canceled or there was a compilation error in one of the test files.
    //   const stopBtn = document.getElementById('runTestsTabStopAction')
    //   stopBtn.setAttribute('disabled', 'disabled')
    //   const stopBtnLabel = document.getElementById('runTestsTabStopActionLabel')
    //   stopBtnLabel.innerText = 'Stop'
    //   if (this.data.selectedTests.length !== 0) {
    //     const runBtn = document.getElementById('runTestsTabRunAction')
    //     runBtn.removeAttribute('disabled')
    //   }
    //   this.areTestsRunning = false
    // }
  }

  const runTest = (testFilePath, callback) => {
    console.log('runTest----->', testFilePath, hasBeenStopped)
    isDebugging = false
    if (hasBeenStopped) {
      // this.updateFinalResult()
      return
    }
    // this.resultStatistics.hidden = false
    testTab.fileManager.readFile(testFilePath).then((content) => {
      const runningTests = {}
      runningTests[testFilePath] = { content }
      const { currentVersion, evmVersion, optimize, runs, isUrl } = testTab.compileTab.getCurrentCompilerConfig()
      const currentCompilerUrl = isUrl ? currentVersion : urlFromVersion(currentVersion)
      const compilerConfig = {
        currentCompilerUrl,
        evmVersion,
        optimize,
        usingWorker: canUseWorker(currentVersion),
        runs
      }
      const deployCb = async (file, contractAddress) => {
        const compilerData = await testTab.call('compilerArtefacts', 'getCompilerAbstract', file)
        await testTab.call('compilerArtefacts', 'addResolvedContract', contractAddress, compilerData)
      }
      testTab.testRunner.runTestSources(
        runningTests,
        compilerConfig,
        (result) => testCallback(result, runningTests),
        (_err, result, cb) => resultsCallback(_err, result, cb),
        deployCb,
        (error, result) => {
          updateFinalResult(error, result, testFilePath)
          callback(error)
        }, (url, cb) => {
          return testTab.contentImport.resolveAndSave(url).then((result) => cb(null, result)).catch((error) => cb(error.message))
        }, { testFilePath }
      )
    }).catch((error) => {
      console.log('Error in runTest---->', error)
      if (error) return // eslint-disable-line
    })
  }

  const runTests = () => {
    console.log('runtests--->')
    areTestsRunning = true
    hasBeenStopped = false
    readyTestsNumber = 0
    runningTestsNumber = selectedTests.length
    setDisableStopButton(false)
    setDisableRunButton(true)
    clearResults()
    // yo.update(this.resultStatistics, this.createResultLabel())
    const tests = selectedTests
    if (!tests) return
    // this.resultStatistics.hidden = tests.length === 0
    // _paq.push(['trackEvent', 'solidityUnitTesting', 'runTests'])
    async.eachOfSeries(tests, (value: any, key: any, callback: any) => {
      if (hasBeenStopped) return
      runTest(value, callback)
    })
  }

  const updateRunAction = (currentFile : any = null) => {
    console.log('updateRunAction --currentFile-->', currentFile)
    const isSolidityActive = testTab.appManager.isActive('solidity')
    if (!isSolidityActive || !selectedTests?.length) {
      setDisableRunButton(true)
      if (!currentFile || (currentFile && currentFile.split('.').pop().toLowerCase() !== 'sol')) {
        setRunButtonTitle('No solidity file selected')
      } else {
        setRunButtonTitle('The "Solidity Plugin" should be activated')
      }
    }
  }

  const stopTests = () => {
    console.log('stopTests')
    setHasBeenStopped(true)
    setStopButtonLabel('Stopping')
    setDisableStopButton(true)
    setDisableRunButton(true)
  }

  const getCurrentSelectedTests = () => {
    let selectedTestsList: TestObject[] = testFiles.filter(testFileObj => testFileObj.checked)
    return selectedTestsList.map(testFileObj => testFileObj.fileName)
  }

  const toggleCheckbox = (eChecked: any, index:any) => {
    testFiles[index].checked = eChecked
    setTestFiles(testFiles)
    selectedTests = getCurrentSelectedTests()
    console.log('selectedTests----->', selectedTests)
    setSelectedTests(selectedTests)
    if (eChecked) {
      setCheckSelectAll(true)
      setDisableRunButton(false)
      if ((readyTestsNumber === runningTestsNumber || hasBeenStopped) && stopButtonLabel.trim() === 'Stop') {
        setRunButtonTitle('Run tests')
      }
    } else if (!selectedTests.length) {
      setCheckSelectAll(false)
      setDisableRunButton(true)
      setRunButtonTitle('No test file selected')
    } else setCheckSelectAll(false)
  }

  const checkAll = (event: any) => {
    testFiles.forEach((testFileObj) =>  testFileObj.checked = event.target.checked)
    setTestFiles(testFiles)
    setCheckSelectAll(event.target.checked)
    if(event.target.checked) {
      selectedTests = getCurrentSelectedTests()
      setSelectedTests(selectedTests)
      setDisableRunButton(false)
    } else {
      setSelectedTests([])
      setDisableRunButton(true)
    }
  }

  const updateTestFileList = () => {
    console.log('updateTestFileList--tests->', allTests)
    if(allTests?.length) {
      testFiles =  allTests.map((testFile) => { return {'fileName': testFile, 'checked': true }})
      setCheckSelectAll(true)
    }
    else 
      testFiles = []
    setTestFiles(testFiles)
  }

  const createResultLabel = () => {
    return (<span className='text-info h6'>Progress: none finished (of none)</span>)
    // if (!this.data.selectedTests) return yo`<span></span>`
    // const ready = this.readyTestsNumber ? `${this.readyTestsNumber}` : '0'
    // return yo`<span class='text-info h6'>Progress: ${ready} finished (of ${this.runningTestsNumber})</span>`
  }

  const [resultStatistics] = useState(createResultLabel())

  return (
    <div className="px-2" id="testView">
        <div className="infoBox">
          <p className="text-lg"> Test your smart contract in Solidity.</p>
          <p> Select directory to load and generate test files.</p>
          <label>Test directory:</label>
          <div>
            <div className="d-flex p-2">
            <datalist id="utPathList">{
              pathOptions.map(function (path) {
                return <option key={path}>{path}</option>
              })
              }
            </datalist>
            <input
              placeholder={defaultPath}
              list="utPathList"
              className="inputFolder custom-select"
              id="utPath"
              data-id="uiPathInput"
              name="utPath"
              value={inputPathValue}
              title="Press 'Enter' to change the path for test files."
              style= {{ backgroundImage: "var(--primary)"}}
              onKeyUp= {handleTestDirInput}
              onChange={handleEnter}
            />
            <button
              className="btn border ml-2"
              data-id="testTabGenerateTestFolder"
              title="Create a test folder"
              disabled={disableCreateButton}
              onClick={handleCreateFolder}
            >
              Create
            </button>
            </div>
          </div>
        </div>
        <div>          
          <div className="d-flex p-2">
            <button
              className="btn border w-50"
              data-id="testTabGenerateTestFile"
              title="Generate sample test file."
              disabled={disableGenerateButton}
              onClick={() => {
                testTabLogic.generateTestFile()
                updateForNewCurrent()
              }}
            >
              Generate
            </button>
            <a className="btn border text-decoration-none pr-0 d-flex w-50 ml-2" title="Check out documentation." target="__blank" href="https://remix-ide.readthedocs.io/en/latest/unittesting.html#test-directory">
              <label className="btn p-1 ml-2 m-0">How to use...</label>
            </a>
          </div>
          <div className="d-flex p-2">
            <button id="runTestsTabRunAction" title={runButtonTitle} data-id="testTabRunTestsTabRunAction" className="w-50 btn btn-primary" disabled={disableRunButton} onClick={runTests}>
              <span className="fas fa-play ml-2"></span>
              <label className="labelOnBtn btn btn-primary p-1 ml-2 m-0">Run</label>
            </button>
            <button id="runTestsTabStopAction" data-id="testTabRunTestsTabStopAction" className="w-50 pl-2 ml-2 btn btn-secondary" disabled={disableStopButton} title="Stop running tests" onClick={stopTests}>
              <span className="fas fa-stop ml-2"></span>
              <label className="labelOnBtn btn btn-secondary p-1 ml-2 m-0" id="runTestsTabStopActionLabel">{stopButtonLabel}</label>
            </button>
          </div>
          <div className="d-flex align-items-center mx-3 pb-2 mt-2 border-bottom">
            <input id="checkAllTests"
              type="checkbox"
              data-id="testTabCheckAllTests"
              onClick={checkAll}
              checked={checkSelectAll}
              onChange={() => {}}
            />
            <label className="text-nowrap pl-2 mb-0" htmlFor="checkAllTests"> Select all </label>
          </div>
          <div className="testList py-2 mt-0 border-bottom">{testFiles?.length ? testFiles.map((testFileObj: any, index) => {
            console.log('testFileObj----->', testFileObj)
            const elemId = `singleTest${testFileObj.fileName}`
            return (
              <div className="d-flex align-items-center py-1">
                <input className="singleTest" id={elemId} onChange={(e) => toggleCheckbox(e.target.checked, index)} type="checkbox" checked={testFileObj.checked}/>
                <label className="singleTestLabel text-nowrap pl-2 mb-0" htmlFor={elemId}>{testFileObj.fileName}</label>
              </div>
            )
          }) 
          : "No test file available" } </div>
          <div className="align-items-start flex-column mt-2 mx-3 mb-0">
            {resultStatistics}
            <label className="text-warning h6" data-id="testTabTestsExecutionStopped" hidden={testsExecutionStoppedHidden}>The test execution has been stopped</label>
            <label className="text-danger h6" data-id="testTabTestsExecutionStoppedError" hidden={testsExecutionStoppedErrorHidden}>The test execution has been stopped because of error(s) in your test file</label>
          </div>
          {/* ${this.testsOutput} */}
        </div>
      </div>
  )
}

export default SolidityUnitTesting