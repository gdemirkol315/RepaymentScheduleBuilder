if (document.readyState == 'loading') {
    document.addEventListener('DOMContentLoaded', addListeners);
} else {
    addListeners();
}

function addListeners() {
    var loanAmount = document.getElementById("loanAmount");
    loanAmount.addEventListener('change', amountCheck);
    var interestRate = document.getElementById("interestRate");
    interestRate.addEventListener('change', amountCheck);

    var paymentStart =document.getElementById('paymentStart');
    paymentStart.addEventListener('change', checkDates);
    var utilization = document.getElementById('utilization');
    utilization.addEventListener('change', checkDates);
    var maturity = document.getElementById('maturity');
    maturity.addEventListener('change', checkDates);
}

function amountCheck(event) {
    var amount = event.target;
    if (isNaN(amount.value) || amount.value < 0) {
        amount.value = 0;
        addAlertMessage("Number entered is not valid!", amount, "warning-"+amount.id)
    } else {
        deleteExistingAlert(amount);
    }
}

function checkDates(event) {
    var checkElement = event.target;
    var paymentStart = new Date($("#paymentStart").val());
    var utilization = new Date($("#utilization").val());
    var maturity = new Date($("#maturity").val());

    if (paymentStart < utilization || maturity <= utilization || maturity < paymentStart) {
        addAlertMessage("Please enter a valid date. Validation rule should be fulfilled Utilization <= Payment Start < Maturity ", checkElement,"warning-"+checkElement.id);
    } else {
        deleteExistingAlert(checkElement);
    }
}

function addAlertMessage(alertMessage, underThisElement, warningId) {
    var warningMessage = document.getElementById(warningId);
    if(warningMessage == null){
      warningMessage = document.createElement("div");
      warningMessage.className = "alert alert-danger";
      warningMessage.innerHTML = alertMessage;
          warningMessage.id = warningId;
      insertAfter(warningMessage, underThisElement);
    }
}

function insertAfter(newNode, existingNode) {
    existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
}

function deleteExistingAlert(afterThisElement) {
    if (afterThisElement.nextSibling.className == "alert alert-danger") {
        afterThisElement.nextSibling.remove();
    }

}

function execute() {
    try {
        if (globalWarningExists() || !allFieldsEntered()) {
            throw ("Warnings exists can not execute!");
        }
        var loanAmount = document.getElementById("loanAmount").value
        var interestRate = document.getElementById("interestRate").value
        var frequency = getElementInsideContainer("frequencyDropdownGr", "frequency").value;
        var paymentStart = new Date($("#paymentStart").val());
        var utilization = new Date($("#utilization").val());
        var maturity = new Date($("#maturity").val());
        var paymentSchedule = calculatePaymentSchedule(loanAmount, interestRate, frequency, utilization, maturity, paymentStart);
        if (tableAlreadyFull()) {
            emptyTable();
        }

        var result = document.getElementById("result");
        result.className = "visible";
        fillRepaymentTable(paymentSchedule);
        var eir = xirr(paymentSchedule) * 100;
        var npvs = paymentsNpv(paymentSchedule, eir);
        setNpvResult(paymentSchedule, npvs, eir);
    } catch (e) {
        console.error(e);
    }
}
function allFieldsEntered(){
    var loanAmount = document.getElementById("loanAmount").value
    var interestRate = document.getElementById("interestRate").value
    var frequency = getElementInsideContainer("frequencyDropdownGr", "frequency").value;
    var paymentStart = $("#paymentStart").val();
    var utilization = $("#utilization").val();
    var maturity = $("#maturity").val();
    if (loanAmount == "" ||
        interestRate =="" ||
        frequency == "Please select from dropdown" ||
        utilization == '' ||
        paymentStart == '' ||
        maturity == ''
    ){
        var entriesDiv = document.getElementById('entries')
        addAlertMessage('Please fill all the fields!', entriesDiv,'global-warning')
        return false
    }
    return true
}
function globalWarningExists() {
    var globalWarning = document.getElementById("global-warning");
    if (warningsElementExists() && globalWarning == null) {
        addAlertMessage("Wrong entries exist. Please correct before execution.",
            document.getElementById("entries"), "global-warning");
        return true;
    } else if (warningsElementExists() && globalWarning != null) {
        return true;
    }
    else {
        if (globalWarning != null) {
            globalWarning.remove();
        }
        return false;
    }
}

function warningsElementExists() {
    var entries = document.getElementById("entries");
    return entries.getElementsByClassName("alert alert-danger").length > 0;
}

function getElementInsideContainer(containerID, childID) {
    var elm = document.getElementById(childID);
    var parent = elm ? elm.parentNode : {};
    return (parent.id && parent.id === containerID) ? elm : {};
}



function calculatePaymentSchedule(loanAmount, interestRate, frequency, utilizationDate, maturityDate, paymentStart) {
    var frequency = frequency.toUpperCase();
    var durationDays = getDifferenceInDays(maturityDate, paymentStart);
    var nInstallments = Math.ceil(durationDays / getPeriodicityDays(frequency));
    var installmentAmount = loanAmount / nInstallments;
    var remainingPrincipal = loanAmount;
    var payments = [];
    var interestAmount = 0.00;
    var previousPaymentDate = new Date(utilizationDate);
    var paymentDate = new Date();
    if (paymentStart == utilizationDate) {
        paymentDate = getNextPaymentDate(paymentStart, frequency);
    } else {
        paymentDate = paymentStart;
    }
    payments.push(new Payment("utilization", -loanAmount, 0, interestRate, 0, null, utilizationDate))
    for (let i = 0; i < nInstallments; i++) {
        interestAmount = remainingPrincipal * getDifferenceInDays(paymentDate, previousPaymentDate) / 360 * interestRate / 100
        payments.push(new Payment(i, installmentAmount, remainingPrincipal, interestRate, interestAmount, previousPaymentDate, paymentDate));
        remainingPrincipal = remainingPrincipal - installmentAmount;
        previousPaymentDate = paymentDate;
        paymentDate = getNextPaymentDate(paymentDate, frequency);
    }

    return payments;
}

function Payment(id, principalPayment, remainingPrincipal, interestRate, interestAmount, previousPaymentDate, paymentDate) {
    this.id = id;
    this.principalPayment = principalPayment;
    this.remainingPrincipal = remainingPrincipal;
    this.interestRate = interestRate;
    this.interestAmount = interestAmount;
    this.previousPaymentDate = previousPaymentDate;
    this.paymentDate = paymentDate;
}

function getDifferenceInDays(thisDate, minusThisDate) {
    if (thisDate != null && minusThisDate != null) {
    var durationTime = thisDate.getTime() - minusThisDate.getTime();
        return Math.round(durationTime / (1000 * 3600 * 24));
    }
    return 0;
}

function getNextPaymentDate(previousPaymentDate, paymentFrequency) {

    if (paymentFrequency == 'M') {
        return addMonths(previousPaymentDate, 1);
    } else if (paymentFrequency == 'Q') {
        return addMonths(previousPaymentDate, 3);
    } else if (paymentFrequency == 'H') {
        return addMonths(previousPaymentDate, 6);
    } else if (paymentFrequency == 'J') {
        return addMonths(previousPaymentDate, 12);
    }
    throw 'ERROR: unknown periodicity'
}

function getPeriodicityDays(paymentFrequency) {

    if (paymentFrequency == 'M') {
        return 31;
    } else if (paymentFrequency == 'Q') {
        return 92;
    } else if (paymentFrequency == 'H') {
        return 164;
    } else if (paymentFrequency == 'J') {
        return 365;
    }
    throw 'ERROR: unknown periodicity'
}

function getEOM(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date, nMonths) {
    let year = date.getFullYear();
    let month = date.getMonth();
    let day = date.getDay();

    for (var i = 0; i < nMonths; i++) {
        if (month == 12) {
            year++;
            month = 1
        } else {
            month++;
        }
    }
    return getEOM(new Date(year, month, 1));
}

function convertDateToString(date) {
    if (date != null) {
        var dd = String(date.getDate()).padStart(2, '0');
        var mm = String(date.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = date.getFullYear();
        return dd + '.' + mm + '.' + yyyy;
    }
    return "-"
}

function tableAlreadyFull() {
    var rows = document.getElementsByTagName("td");
    return rows.length != 0;
}

function emptyTable() {
    var table = document.getElementById("resultTable");
    for (var i = 1; table.rows.length - 1; i++) {
        table.deleteRow(1);
    }
    var tableNpv = document.getElementById("npvTable");
    for (var i = 1; tableNpv.rows.length - 1; i++) {
        tableNpv.deleteRow(1);
    }
    document.getElementById("npvP").innerHTML = "";
    var chart = document.getElementById("npvChart").getContext("2d");
    if (chart.className == "chartjs-render-monitor") {
        chart.destroy();
    }
}


function fillRepaymentTable(payments) {
    var table = document.getElementById("resultTable");

    for (let i = 0; i < payments.length; i++) {
        var row = table.insertRow(i + 1);
        var id = row.insertCell(0);
        var previousPaymentDate = row.insertCell(1);
        var paymentDate = row.insertCell(2);
        var principalPayment = row.insertCell(3);
        var accumulatingDays = row.insertCell(4);
        var remaningPrincipal = row.insertCell(5);
        var interestAmount = row.insertCell(6);
        row.id = "payment-" + payments[i].id;
        row.className = "payment";
        id.innerHTML = payments[i].id;
        id.className = "paymentId";
        previousPaymentDate.innerHTML = convertDateToString(payments[i].previousPaymentDate);
        previousPaymentDate.className = "previousPaymentDate";
        paymentDate.innerHTML = convertDateToString(payments[i].paymentDate);
        paymentDate.className = "paymentDate";
        principalPayment.innerHTML = formatNumber(payments[i].principalPayment);
        principalPayment.className = "principalPayment";
        accumulatingDays.innerHTML = getDifferenceInDays(payments[i].paymentDate, payments[i].previousPaymentDate);
        accumulatingDays.className = "accumulatingDays";
        remaningPrincipal.innerHTML = formatNumber(payments[i].remainingPrincipal);
        remaningPrincipal.className = "remaningPrincipal";
        interestAmount.innerHTML = formatNumber(payments[i].interestAmount);
        interestAmount.className = "interestAmount";

    }
}


function excelReport(tableName) {
    var tab_text = "<table border='2px'><tr bgcolor='#87AFC6'>";
    var textRange; var j = 0;
    tab = document.getElementById(tableName);

    for (j = 0; j < tab.rows.length; j++) {
        tab_text = tab_text + tab.rows[j].innerHTML + "</tr>";
    }

    tab_text = tab_text + "</table>";

    var ua = window.navigator.userAgent;
    var msie = ua.indexOf("MSIE ");

    if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./))     
    {
        txtArea1.document.open("txt/html", "replace");
        txtArea1.document.write(tab_text);
        txtArea1.document.close();
        txtArea1.focus();
        sa = txtArea1.document.execCommand("SaveAs", true, "Say Thanks to Sumit.xls");
    }
    else             
        sa = window.open('data:application/vnd.ms-excel,' + encodeURIComponent(tab_text));

    return (sa);
}


function xirr(payments) {

    // Calculates the resulting amount
    var irrResult = function (payments, rate) {
        var r = rate + 1;
        var result = payments[0].principalPayment + payments[0].interestAmount;
        for (var i = 1; i < payments.length; i++) {
            result += (payments[i].principalPayment + payments[i].interestAmount) /
                Math.pow(r, getDifferenceInDays(payments[i].paymentDate, payments[0].paymentDate) / 365);
        }
        return result;
    }

    // Calculates the first derivation
    var irrResultDeriv = function (payments, rate) {
        var r = rate + 1;
        var result = 0;
        for (var i = 1; i < payments.length; i++) {
            var frac = getDifferenceInDays(payments[i].paymentDate, payments[0].paymentDate) / 365;
            result -= frac * (payments[i].principalPayment + payments[i].interestAmount) / Math.pow(r, frac + 1);
        }
        return result;
    }

    // Check that values contains at least one positive value and one negative value
    var positive = false;
    var negative = false;
    for (var i = 0; i < payments.length; i++) {
        if ((payments[i].principalPayment + payments[i].interestAmount) > 0) positive = true;
        if ((payments[i].principalPayment + payments[i].interestAmount) < 0) negative = true;
    }

    // Return error if values does not contain at least one positive value and one negative value
    if (!positive || !negative) return '#NUM!';

    // Initialize guess and resultRate
    var interest = (typeof payments[0].interestRate === 'undefined') ? 0.1 : payments[0].interestRate/100;
    var resultRate = interest;

    // Set maximum epsilon for end of iteration
    var epsMax = 1e-10;

    // Set maximum number of iterations
    var iterMax = 50;

    // Implement Newton's method
    var newRate, epsRate, resultValue;
    var iteration = 0;
    var contLoop = true;
    do {
        resultValue = irrResult(payments, resultRate);
        newRate = resultRate - resultValue / irrResultDeriv(payments, resultRate);
        epsRate = Math.abs(newRate - resultRate);
        resultRate = newRate;
        contLoop = (epsRate > epsMax) && (Math.abs(resultValue) > epsMax);
    } while (contLoop && (++iteration < iterMax));

    if (contLoop) return '#NUM!';

    // Return internal rate of return
    return resultRate;
}

function setNpvResult(payments, paymentsNpv, eir) {
    fillNpvTable(payments, paymentsNpv);
    fillNpvChart();
    document.getElementById("npvP").innerHTML =
        "Net present value of this loan is " + formatNumber(getTotalNpv(paymentsNpv)) +
    " with eir of %" + formatNumber(eir, 4);
}

function formatNumber(number, digits) {
    if (typeof digits === 'undefined') {
        return number.toLocaleString(undefined, { minimumFractionDigits: 2 })
    }
    return number.toLocaleString(undefined, { minimumFractionDigits: digits })
}

function paymentsNpv(payments, eir) {
    var npvs = [];
    
    try {
        for (var i = 1; i < payments.length; i++) {
            var npvTmp = npv(payments[i].previousPaymentDate,
                payments[i].paymentDate,
                (payments[i].principalPayment + payments[i].interestAmount),
                eir);
            npvs.push(new Payment(i-1, npvTmp, 0, 0, 0, null, payments[i].paymentDate));
        }
        return npvs;
    } catch (error) {
        console.log(error);
    }
    return paymentsNpv;
}

function npv(startDate, paymentDate, cashflow, eir) {
    var days = getDifferenceInDays(paymentDate, startDate);
    if (days != 0) {
        return cashflow / ((1 + eir / 100) ** (days / 365))
    }
    return cashflow;
}

function getTotalNpv(paymentsNpv) {
    var totalNpv = 0;
    for (var i = 0; i < paymentsNpv.length; i++) {
        totalNpv += paymentsNpv[i].principalPayment; 
    }
    return totalNpv;
}

function fillNpvTable(payments, npvs) {
    var table = document.getElementById("npvTable");
    var totalCashFlowVal = 0;
    var totalNpvVal = 0;
    for (let i = 0; i < npvs.length; i++) {
        var row = table.insertRow(i + 1);
        var id = row.insertCell(0);
        var paymentDate = row.insertCell(1);
        var cashFlow= row.insertCell(2);
        var npv = row.insertCell(3);
        var totalCashFlow = row.insertCell(4);
        var totalNpv = row.insertCell(5);
        
        row.id = "npv-" + npvs[i].id;
        row.className = "npv";
        id.innerHTML = npvs[i].id;
        id.className = "npvId";
        paymentDate.innerHTML = convertDateToString(npvs[i].paymentDate);
        paymentDate.className = "paymentDate";
        var curCashFlow = payments[i + 1].principalPayment + payments[i + 1].interestAmount
        cashFlow.innerHTML = formatNumber(curCashFlow);
        cashFlow.className = "cashFlow";
        totalCashFlowVal += curCashFlow;
        var curNpv = npvs[i].principalPayment
        totalNpvVal += curNpv;
        npv.innerHTML = formatNumber(curNpv);
        npv.className = "npvAmount";
        totalCashFlow.innerHTML = formatNumber(totalCashFlowVal);
        totalCashFlow.className = "totalCashFlow";
        totalNpv.innerHTML = formatNumber(totalNpvVal);
        totalNpv.className = "totalNpv";

    }
}

function fillNpvChart() {

    var dates = getValuesInsideContainerFromClass("npvTable", "paymentDate", false);
    var cashFlows = getValuesInsideContainerFromClass("npvTable","cashFlow", true);
    var npvs = getValuesInsideContainerFromClass("npvTable", "npvAmount", true);

    var ctxL = document.getElementById("npvChart").getContext('2d');
    ctxL = new Chart(ctxL, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [{
                label: "Fiscal Cashflow",
                data: cashFlows,
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 0.2)'
            },
            {
                label: "NPV of Cashflow",
                data: npvs,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 0.2)'
            }
            ]
        },
        options: {
            responsive: true
        }
    });
}

function getValuesInsideContainerFromClass(container, className,castToNumber) {
    var npvTable = document.getElementById(container);
    var elements = npvTable.getElementsByClassName(className);
    var values = [];

    for (var i = 0; i < elements.length; i++) {
        if (castToNumber) {
            values.push(Number(elements[i].innerHTML.replaceAll(",","")));
        } else {
            values.push(elements[i].innerHTML);
        }
    }
    return values;

}