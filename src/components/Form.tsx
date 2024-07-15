import { ChangeEventHandler } from "react";
import { Label, Input, Textarea, Select, Box, Text, Checkbox } from "theme-ui";
import InfoIcon from "./InfoIcon";

const infoIconStyle = {
    ml: 1,
    pt: "1px",
    pb: "3px",
    height: "16px",
    width: "16px",
    fill: "primary"
}

interface ValidationMessageProps {
    type: string,
    text: string
}

interface SelectOptionProps {
    value: string,
    label: string
}

interface SelectProps {
    name: string,
    label: string,
    options: Array<SelectOptionProps>,
    defaultValue?: string,
    required?: boolean,
    message?: ValidationMessageProps,
    disabled?: boolean,
    help?: string,
    onChange?: ChangeEventHandler<HTMLSelectElement>,
    sx?: any,
}

interface InputProps {
    name: string,
    label: string,
    type?: string,
    placeholder?: string,
    defaultValue?: string,
    required?: boolean,
    message?: ValidationMessageProps,
    disabled?: boolean,
    help?: string,
    onChange?: ChangeEventHandler<HTMLInputElement>,
    sx?: any,
}

interface TextareaProps {
    name: string,
    label: string,
    rows?: number,
    placeholder?: string,
    defaultValue?: string,
    required?: boolean,
    message?: ValidationMessageProps,
    disabled?: boolean,
    help?: string,
    onChange?: ChangeEventHandler<HTMLTextAreaElement>,
    sx?: any,
}

interface CheckboxProps {
    name: string,
    label: string,
    defaultValue?: boolean,
    required?: boolean,
    message?: ValidationMessageProps,
    disabled?: boolean,
    help?: string,
    onChange?: ChangeEventHandler<HTMLInputElement>,
    sx?: any,
}

const defaultSelectProps: SelectProps = {
    name: "default_id",
    label: "Default Label",
    options: [],
    defaultValue: null,
    required: false,
    message: null,
    disabled: false,
    help: null,
    onChange: null,
    sx: null,
}

const defaultInputProps: InputProps = {
    name: "default_id",
    label: "Default Label",
    type: "text",
    placeholder: null,
    defaultValue: null,
    required: false,
    message: null,
    disabled: false,
    help: null,
    onChange: null,
    sx: null
}

const defaultTextareaProps: TextareaProps = {
    name: "default_id",
    label: "Default Label",
    rows: 3,
    placeholder: null,
    defaultValue: null,
    required: false,
    message: null,
    disabled: false,
    help: null,
    onChange: null,
    sx: null,
}

const defaultCheckboxProps: CheckboxProps = {
    name: "default_id",
    label: "Default Label",
    defaultValue: false,
    required: false,
    message: null,
    disabled: false,
    help: null,
    onChange: null,
    sx: null,
}

function ValidationMessage({message}) {
    if (!message) {
        return <></>
    }

    const messageColors = {
        "warning": "orange",
        "success": "green",
        "error": "red",
        "info": "blue"
    }

    return (
        <>
            <Text
                variant="detail"
                sx={{
                    color: messageColors[message.type],
                    position: "absolute",
                }}>
                    { message.text }
                </Text>
        </>
    )
}

function RequiredLabel({required}) {
    if (!required) {
        return <></>
    }

    return (
        <Text variant="detail" sx={{color: "red", ml: 1}}>*</Text>
    )
}


export function FormSelect(input: SelectProps) {
    const {label, name, options, defaultValue, required, message, disabled, help, onChange, ...extras} = input;

    const arrow = disabled ? <></> : null

    return (
        <Box {...extras}>
            <Box sx={{textAlign: "left"}}>
                <Label htmlFor={name}>{label}<RequiredLabel required={required} />
                {
                    help ? <InfoIcon title={help} sx={infoIconStyle}/> : <></>
                }
                </Label>
                <Select
                    arrow={arrow}
                    name={name}
                    id={name}
                    defaultValue={defaultValue}
                    onChange={onChange}
                    disabled={disabled} >
                    {
                        options.map((option, i) => {
                            return (
                                <option key={"select-" + i} value={option.value} selected={defaultValue == option.value}>{option.label}</option>
                            )
                        })
                    }
                </Select>
                <ValidationMessage message={message} />
            </Box>
        </Box>
    )
}

FormSelect.defaultProps = defaultSelectProps;

export function FormInput(input : InputProps) {
    const {label, name, type, placeholder, defaultValue, required, message, disabled, help, onChange, ...extras} = input;
    return (
        <Box {...extras}>
            <Box sx={{textAlign: "left"}}>
                {type == "hidden" ? <></> : <Label htmlFor={name}>{label}<RequiredLabel required={required} />
                {
                    help ? <InfoIcon title={help} sx={infoIconStyle}/> : <></>
                }
                </Label>}
                <Input type={type} name={name} id={name} placeholder={placeholder} defaultValue={defaultValue} onChange={onChange} disabled={disabled} />
                <ValidationMessage message={message} />
            </Box>
        </Box>
    )
}

FormInput.defaultProps = defaultInputProps;


export function FormTextarea(input : TextareaProps) {
    const {name, label, rows, placeholder, defaultValue, required, message, disabled, help, onChange, ...extras} = input;
    return (
        <Box {...extras}>
            <Box sx={{textAlign: "left"}}>
                <Label htmlFor={name}>{label}<RequiredLabel required={required} />
                {
                    help ? <InfoIcon title={help} sx={infoIconStyle}/> : <></>
                }
                </Label>
                <Textarea name={name} id={name} rows={rows} placeholder={placeholder} defaultValue={defaultValue} disabled={disabled} onChange={onChange} />
                <ValidationMessage message={message} />
            </Box>
        </Box>
    )
}

FormTextarea.defaultProps = defaultTextareaProps;


export function FormCheckbox(input : CheckboxProps) {
    var {name, label, defaultValue, required, message, disabled, help, onChange, ...extras} = input;
    return (
        <Box {...extras}>
            <Box sx={{textAlign: "left"}}>
              <Label>
                <Checkbox
                    name={name}
                    required={required}
                    disabled={disabled}
                    defaultChecked={defaultValue}
                />
                {label}
                <RequiredLabel required={required} />
                {
                    help ? <InfoIcon title={help} sx={infoIconStyle}/> : <></>
                }
              </Label>
              <ValidationMessage message={message} />
            </Box>
        </Box>
    )
}

FormCheckbox.defaultProps = defaultCheckboxProps;