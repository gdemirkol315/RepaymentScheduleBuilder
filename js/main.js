var riceData = {
    labels: ["January", "February", "March", "April", "May", "June"],
    datasets:
        [
            {
                fillColor: "rgba(172,194,132,0.4)",
                strokeColor: "#ACC26D",
                pointColor: "#fff",
                pointStrokeColor: "#9DB86D",
                data: [203000, 15600, 99000, 25100, 30500, 24700]
            }
        ]
}

var rice = document.getElementById('rice');
new     Chart(rice).Line(riceData);

function execute() {
    var loanAmount = document.getElementById("loanAmount").value
    var interestRate = document.getElementById("interestRate").value
    var frequency = getElementInsideContainer("frequencyDropdownGr", "frequency").value;
    var paymentStart = new Date($("#paymentStart").val());
    var utilization = new Date($("#utilization").val());
    var maturity = new Date($("#maturity").val());
    var payments = calculate(loanAmount, interestRate, frequency, utilization, maturity, paymentStart);
    if (tableAlreadyFull()) {
        emptyTable();
    }
    addPaymentIntoTable(payments);

    var eir = xirr(payments) * 100;
    var npv = paymentsNpv(payments,eir);
    setNpvResult(npv,eir);
    
}

function getElementInsideContainer(containerID, childID) {
    var elm = document.getElementById(childID);
    var parent = elm ? elm.parentNode : {};
    return (parent.id && parent.id === containerID) ? elm : {};
}

function addPaymentIntoTable(payments) {
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
    var result = document.getElementById("result");
    result.className="visible";
}


function isValidPaymentStartDate(paymentStart, utilization) {
    if (isValidDate(paymentStart)) {
        let paymentStart = new Date(paymentStart);
        let utilization = new Date(utilization);
        if (paymentStart > utilization) {
            return false;
            console.log('Payment start date can not be earlier than utilization date!')
        } else {
            return true;
        }
    }
    return false;
}

function isValidMaturityDate(maturity, utilization, paymentStart) {
    if (isValidDate(maturity)) {
        var maturity = new Date(maturity);
        var paymentStart = new Date(paymentStart);
        var utilization = new Date(utilization);
        if ((maturity < utilization) || (maturity < paymentStart)) {
            return false;
            console.log('Maturity date can not be earlier than utilization date or payment start date!')
        } else {
            return true;
        }
    }
    return false;
}

function isValidDate(dateString) {
    var regEx = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateString.match(regEx)) {
        console.log('Invalid date format!')
        return false;
    }
    var d = new Date(dateString);
    var dNum = d.getTime();
    if (!dNum && dNum !== 0) {
        console.log('Invalid date format!')
        return false;
    }
    if (d.toISOString().slice(0, 10) === dateString) {
        return true;
    } else {
        console.log('Invalid date format!')
        return false;
    }
}

function calculate(loanAmount, interestRate, frequency, utilizationDate, maturityDate, paymentStart) {
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
}

function excelReport() {
    var tab_text = "<table border='2px'><tr bgcolor='#87AFC6'>";
    var textRange; var j = 0;
    tab = document.getElementById('resultTable');

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



function paymentsNpv(payments, eir) {
    var totalNpv = 0;
    try {
        for (var i = 1; i < payments.length; i++) {
            totalNpv += npv(payments[i].previousPaymentDate,
                payments[i].paymentDate,
                (payments[i].principalPayment + payments[i].interestAmount),
                eir);
            startDate = payments[i].paymentDate;
        }
        return totalNpv;
    } catch (error) {
        console.log(error);
    }
    return totalNpv;
}

function npv(startDate, paymentDate, cashflow, eir) {
    var days = getDifferenceInDays(paymentDate, startDate);
    if (days != 0) {
        return cashflow / ((1 + eir / 100) ** (days / 365))
    }
    return cashflow;
}

function xirr(payments) {
    // Credits: algorithm inspired by Apache OpenOffice

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

function testData() {
    var loanAmount = document.getElementById("loanAmount");
    loanAmount.value = 2500000;
    var interestRate = document.getElementById("interestRate");
    interestRate.value = 3;
    var frequency = getElementInsideContainer("frequencyDropdownGr", "frequency");
    frequency.value = "M";

}

function setNpvResult(npv, eir) {
    document.getElementById("npvResult").innerHTML =
        "Net present value of this loan is " + formatNumber(npv) +
    " with eir of %" + formatNumber(eir, 4);
}

function formatNumber(number, digits) {
    if (typeof digits === 'undefined') {
        return number.toLocaleString(undefined, { minimumFractionDigits: 2 })
    }
    return number.toLocaleString(undefined, { minimumFractionDigits: digits })
}