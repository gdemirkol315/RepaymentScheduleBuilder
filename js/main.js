
function execute() {
    var loanAmount = document.getElementById("loanAmount").value
    var interestRate = document.getElementById("interestRate").value
    var frequency = getElementInsideContainer("frequencyDropdownGr", "frequency").value;
    var paymentStart = new Date($("#paymentStart").val());
    var utilization = new Date($("#utilization").val());
    var maturity = new Date($("#maturity").val());
    var payments = calculate(loanAmount, interestRate, frequency, utilization, maturity, paymentStart);
    addPaymentIntoTable(payments);
}


function getElementInsideContainer(containerID, childID) {
    var elm = document.getElementById(childID);
    var parent = elm ? elm.parentNode : {};
    return (parent.id && parent.id === containerID) ? elm : {};
}

function addPaymentIntoTable(payments) {
    var table = document.getElementById("result");


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
        principalPayment.innerHTML = Math.round(payments[i].principalPayment);
        principalPayment.className = "principalPayment";
        accumulatingDays.innerHTML = getDifferenceInDays(payments[i].paymentDate, payments[i].previousPaymentDate);
        accumulatingDays.className = "accumulatingDays";
        remaningPrincipal.innerHTML = Math.round(payments[i].remainingPrincipal);
        remaningPrincipal.className = "remaningPrincipal";
        interestAmount.innerHTML = Math.round(payments[i].interestAmount);
        interestAmount.className = "interestAmount";

    }
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
    var durationTime = thisDate.getTime() - minusThisDate.getTime();
    return Math.round(durationTime / (1000 * 3600 * 24));
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
    var dd = String(date.getDate()).padStart(2, '0');
    var mm = String(date.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = date.getFullYear();
    return dd + '.' + mm + '.' + yyyy;
}

function excelReport() {
    var tab_text = "<table border='2px'><tr bgcolor='#87AFC6'>";
    var textRange; var j = 0;
    tab = document.getElementById('result'); // id of table

    for (j = 0; j < tab.rows.length; j++) {
        tab_text = tab_text + tab.rows[j].innerHTML + "</tr>";
        //tab_text=tab_text+"</tr>";
    }

    tab_text = tab_text + "</table>";

    var ua = window.navigator.userAgent;
    var msie = ua.indexOf("MSIE ");

    if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./))      // If Internet Explorer
    {
        txtArea1.document.open("txt/html", "replace");
        txtArea1.document.write(tab_text);
        txtArea1.document.close();
        txtArea1.focus();
        sa = txtArea1.document.execCommand("SaveAs", true, "Say Thanks to Sumit.xls");
    }
    else                 //other browser not tested on IE 11
        sa = window.open('data:application/vnd.ms-excel,' + encodeURIComponent(tab_text));

    return (sa);
}